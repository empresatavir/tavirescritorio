"""A jornada e o APK fecham com execução, não com frase."""

import json
from pathlib import Path

import pytest

from app.modules.factory.apk_build import (
    faltas_toolchain,
    manifesto_incompleto,
    run_apk_sync,
    svgs_sujos,
)
from app.modules.factory.jornada import executar_jornada, run_jornada_sync
from app.modules.factory.work_session import WorkSessionError, evidence_state


def _pedir(estado):
    def pedir(method, path, body=None):
        if method == "GET" and path == "/health":
            return {"status": 200, "json": {"services": []}}
        if method == "GET" and path == "/stats":
            return {
                "status": 200,
                "json": {"running": 0, "queued": 0, "spentToday": 0, "pendingCount": 0},
            }
        if method == "POST" and path == "/tasks":
            estado["tarefa"] = "T-001"
            return {"status": 201, "json": {"id": "T-001", "col": "todo"}}
        if method == "GET" and path == "/tasks":
            return {"status": 200, "json": [{"id": estado.get("tarefa")}]}
        if method == "PATCH" and path.startswith("/tasks/"):
            return {"status": 200, "json": {"id": "T-001", "col": "doing"}}
        if method == "POST" and path == "/jobs":
            estado["job"] = "job-001"
            return {"status": 201, "json": {"id": "job-001", "status": "queue"}}
        if method == "POST" and path.endswith("/cancel"):
            return {"status": 200, "json": {"id": "job-001", "status": "cancel"}}
        if method == "GET" and path == "/pendings":
            return {"status": 200, "json": []}
        return {"status": 404, "json": {"error": path}}

    return pedir


def test_jornada_percorre_tarefa_job_e_cancelamento():
    assert executar_jornada(_pedir({})) == []


def test_jornada_reprova_quando_a_api_falha(tmp_path: Path):
    def pedir(method, path, body=None):
        return {"status": 500, "json": {"error": "falha"}}

    result = run_jornada_sync(
        tmp_path,
        "qa_jornada",
        agent_name="Validador Visual",
        title="Jornada",
        expected=["qa/report-jornada.md"],
        pedir=pedir,
        shell=lambda *_args, **_kwargs: (0, "ok"),
    )
    assert evidence_state(tmp_path, "qa_jornada") == "reprovado"
    assert "Resultado: REPROVADO" in (tmp_path / "qa" / "report-jornada.md").read_text(encoding="utf-8")
    assert "jornada falhou" in result["note"]


def test_jornada_no_office_real():
    office = (
        Path(__file__).resolve().parents[3]
        / "tavir-interno"
        / "mobile-tavir-7375fb"
        / "backend"
        / "office.py"
    )
    if not office.is_file():
        pytest.skip("office.py do Controle Mobile não está no workspace")
    from app.modules.factory.jornada import carregar_office

    pedir = carregar_office(office.parent.parent)
    assert pedir is not None
    assert executar_jornada(pedir) == []


def test_apk_web_nao_chama_flutter(tmp_path: Path):
    chamado = {"vezes": 0}

    def shell(*_args, **_kwargs):
        chamado["vezes"] += 1
        return 0, "não deveria"

    result = run_apk_sync(
        tmp_path,
        "build_apk",
        agent_name="Dev Frontend",
        title="APK",
        expected=[],
        shell=shell,
    )
    assert chamado["vezes"] == 0
    assert evidence_state(tmp_path, "build_apk") == "aprovado"
    assert "sem APK" in result["note"]


def test_apk_falta_flutter_diz_o_comando(tmp_path: Path):
    _preparar_app(tmp_path)
    with pytest.raises(WorkSessionError) as exc:
        run_apk_sync(
            tmp_path,
            "build_apk",
            agent_name="Dev Frontend",
            title="APK",
            expected=[],
            which=lambda _nome: None,
            sdk=tmp_path / "sdk",
        )
    assert "flutter não está no PATH" in str(exc.value)


def test_apk_grava_o_binario(tmp_path: Path):
    _preparar_app(tmp_path)
    sdk = tmp_path / "sdk"
    (sdk / "platforms" / "android-36").mkdir(parents=True)
    (sdk / "ndk" / "28.2.13676358").mkdir(parents=True)

    def shell(root, args, timeout=180, cwd=None):
        apk = root / "aplicativo" / "build" / "app" / "outputs" / "flutter-apk" / "app-release.apk"
        apk.parent.mkdir(parents=True, exist_ok=True)
        apk.write_bytes(b"apk")
        return 0, "Built"

    result = run_apk_sync(
        tmp_path,
        "build_apk",
        agent_name="Dev Frontend",
        title="APK",
        expected=[],
        shell=shell,
        which=lambda _nome: "flutter",
        sdk=sdk,
    )
    assert evidence_state(tmp_path, "build_apk") == "aprovado"
    assert "app-release.apk" in result["note"]


def test_manifesto_e_svg_sujo():
    assert manifesto_incompleto("<manifest></manifest>")
    assert manifesto_incompleto(
        '<uses-permission android:name="android.permission.INTERNET"/>'
        '<application android:usesCleartextTraffic="true">'
    ) == []
    assert "platforms;android-36" in " ".join(faltas_toolchain(lambda _nome: "flutter", None))


def test_svg_com_c2pa_reprova(tmp_path: Path):
    pasta = tmp_path / "frontend"
    pasta.mkdir()
    (pasta / "marca.svg").write_text("<svg><metadata>c2pa:manifest</metadata></svg>", encoding="utf-8")
    assert svgs_sujos(tmp_path) == ["frontend/marca.svg"]
    _preparar_app(tmp_path)
    with pytest.raises(WorkSessionError) as exc:
        run_apk_sync(
            tmp_path,
            "build_apk",
            agent_name="Dev Frontend",
            title="APK",
            expected=[],
            which=lambda _nome: "flutter",
            sdk=tmp_path,
        )
    assert "c2pa" in str(exc.value)


def _preparar_app(root: Path) -> None:
    (root / "context").mkdir(exist_ok=True)
    (root / "context" / "contrato.json").write_text(
        json.dumps({"entregavel": "apk", "read_ok": True, "telas": ["Home"], "resumo": "Celular"}),
        encoding="utf-8",
    )
    app = root / "aplicativo"
    app.mkdir(exist_ok=True)
    (app / "pubspec.yaml").write_text("name: tavir_controle\n", encoding="utf-8")
    manifesto = app / "android" / "app" / "src" / "main"
    manifesto.mkdir(parents=True, exist_ok=True)
    (manifesto / "AndroidManifest.xml").write_text(
        '<manifest><uses-permission android:name="android.permission.INTERNET"/>'
        '<application android:usesCleartextTraffic="true"></application></manifest>',
        encoding="utf-8",
    )
