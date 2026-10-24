"""Compila o APK quando o contrato pede celular.

Sem Flutter ou sem SDK, a etapa falha com o comando que falta.
Ela não grava outro plano.
"""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from app.modules.factory.intake import entregavel_de
from app.modules.factory.work_session import WorkSessionError, evidence_file, run_shell

NDK_VERSION = "28.2.13676358"


def apk_exigido(root: Path) -> bool:
    if entregavel_de(root) in {"apk", "ambos"}:
        return True
    return (root / "aplicativo" / "pubspec.yaml").is_file()


def sdk_padrao(env: dict | None = None) -> Path | None:
    env = env if env is not None else os.environ
    raw = env.get("ANDROID_HOME") or env.get("ANDROID_SDK_ROOT")
    if raw and Path(raw).is_dir():
        return Path(raw)
    for candidate in (Path(r"C:\Android\Sdk"), Path.home() / "AppData" / "Local" / "Android" / "Sdk"):
        if candidate.is_dir():
            return candidate
    return None


def faltas_toolchain(which, sdk: Path | None) -> list[str]:
    faltas = []
    if which("flutter") is None:
        faltas.append("flutter não está no PATH. Instale o Flutter e rode de novo.")
    if sdk is None:
        faltas.append(
            "ANDROID_HOME não aponta para um SDK. "
            'Rode: sdkmanager --sdk_root=SDK "platforms;android-36" "build-tools;36.0.0" "ndk;28.2.13676358"'
        )
        return faltas
    if not (sdk / "platforms" / "android-36").is_dir():
        faltas.append(
            f'Falta platforms;android-36 em {sdk}. '
            f'Rode: sdkmanager --sdk_root={sdk} "platforms;android-36" "build-tools;36.0.0"'
        )
    if not (sdk / "ndk" / NDK_VERSION).is_dir():
        faltas.append(
            f"Falta ndk;{NDK_VERSION} em {sdk}. "
            f'Rode: sdkmanager --sdk_root={sdk} "ndk;{NDK_VERSION}"'
        )
    return faltas


def manifesto_incompleto(text: str) -> list[str]:
    faltas = []
    if "android.permission.INTERNET" not in text:
        faltas.append("O manifesto precisa de android.permission.INTERNET.")
    if "usesCleartextTraffic" not in text:
        faltas.append('O manifesto precisa de android:usesCleartextTraffic="true".')
    return faltas


def svgs_sujos(root: Path) -> list[str]:
    hits = []
    for folder in ("frontend", "aplicativo"):
        base = root / folder
        if not base.is_dir():
            continue
        for path in base.rglob("*.svg"):
            if any(part in {"node_modules", "build", ".dart_tool"} for part in path.parts):
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="replace").lower()
            except OSError:
                continue
            if "<metadata" in text or "c2pa" in text:
                hits.append(path.relative_to(root).as_posix())
    return hits


def _manifesto(root: Path) -> Path | None:
    candidate = root / "aplicativo" / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
    if candidate.is_file():
        return candidate
    return None


def run_apk_sync(
    root: Path,
    stage_def_id: str,
    *,
    agent_name: str,
    title: str,
    expected: list[str],
    on_status=None,
    shell=None,
    which=None,
    sdk: Path | None = None,
    env: dict | None = None,
) -> dict:
    root = root.resolve()
    say = on_status or (lambda _message: None)
    from app.modules.factory.work_session import _write

    if not apk_exigido(root):
        log = (
            "comando: nenhum\nexecucao: passou\ncodigo_saida: 0\n---\n"
            "O entregável não inclui APK.\n"
        )
        files = [_write(root, evidence_file(stage_def_id), log)]
        say(f"{title} não compila APK neste entregável.")
        return {"files": files, "note": "entregável sem APK"}

    pubspec = root / "aplicativo" / "pubspec.yaml"
    if not pubspec.is_file():
        raise WorkSessionError(
            "O APK precisa de aplicativo/pubspec.yaml. "
            "A etapa de frontend grava o cliente Flutter sem apagar a página web."
        )

    sujos = svgs_sujos(root)
    if sujos:
        raise WorkSessionError(
            "SVG com metadata ou c2pa não entra no aplicativo: " + ", ".join(sujos[:6])
        )

    manifesto = _manifesto(root)
    if manifesto is None:
        raise WorkSessionError(
            "Falta aplicativo/android/app/src/main/AndroidManifest.xml "
            "com INTERNET e usesCleartextTraffic."
        )
    faltas_manifesto = manifesto_incompleto(manifesto.read_text(encoding="utf-8", errors="replace"))
    if faltas_manifesto:
        raise WorkSessionError(" ".join(faltas_manifesto))

    resolver = which or shutil.which
    casa = sdk if sdk is not None else sdk_padrao(env)
    faltas = faltas_toolchain(resolver, casa)
    if faltas:
        raise WorkSessionError(" ".join(faltas))

    say(f"{agent_name} compila o APK.")
    if casa is not None and not os.environ.get("ANDROID_HOME"):
        os.environ["ANDROID_HOME"] = str(casa)
        os.environ["ANDROID_SDK_ROOT"] = str(casa)
    run_cmd = shell or run_shell
    code, output = run_cmd(
        root,
        ["flutter", "build", "apk", "--release"],
        timeout=900,
        cwd=root / "aplicativo",
    )
    apk = root / "aplicativo" / "build" / "app" / "outputs" / "flutter-apk" / "app-release.apk"
    if code != 0 or not apk.is_file():
        log = (
            f"comando: flutter build apk --release\nexecucao: falhou\ncodigo_saida: {code}\n---\n"
            f"{output.strip()[:4000]}\n"
        )
        _write(root, evidence_file(stage_def_id), log)
        raise WorkSessionError(
            "flutter build apk --release não gerou "
            "aplicativo/build/app/outputs/flutter-apk/app-release.apk."
        )

    log = (
        "comando: flutter build apk --release\nexecucao: passou\ncodigo_saida: 0\n---\n"
        f"APK: {apk.relative_to(root).as_posix()} ({apk.stat().st_size} bytes)\n"
    )
    files = [_write(root, evidence_file(stage_def_id), log)]
    say(f"{title} gerou o APK.")
    return {"files": files, "note": f"APK {apk.relative_to(root).as_posix()}"}
