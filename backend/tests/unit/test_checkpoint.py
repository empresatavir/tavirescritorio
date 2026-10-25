from pathlib import Path

from app.modules.factory.executor import checkpoint_record, explain_stop
from app.modules.factory.work_session import flutter_executable, resolve_command, run_shell


def test_checkpoint_guarda_o_ultimo_e_limita_o_historico():
    meta = {"checkpoints": [{"stage_def_id": f"s{i}", "status": "saved"} for i in range(12)]}
    stamped = checkpoint_record(
        meta,
        stage_def_id="build_fe",
        title="Construção frontend",
        status="error",
        note="Parou no teste.",
        at="2026-10-25T14:04:00+00:00",
    )
    assert stamped["checkpoint"]["stage_def_id"] == "build_fe"
    assert stamped["checkpoint"]["status"] == "error"
    assert len(stamped["checkpoints"]) == 12
    assert stamped["checkpoints"][-1]["title"] == "Construção frontend"
    assert stamped["checkpoints"][0]["stage_def_id"] == "s1"


def test_explain_stop_nomeia_flutter_quando_o_comando_some():
    card = explain_stop(
        "O teste ainda falha depois da implementação. Código de saída 127. [WinError 2] O sistema não pode encontrar o arquivo especificado",
        "Construção frontend",
        "build_fe",
    )
    assert "flutter" in card["problem"]
    assert "caminho completo" in card["solution"]
    assert card["action"] == "office"


def test_explain_stop_apk_sem_flutter_resolve_no_escritorio():
    card = explain_stop(
        "flutter build apk --release não gerou aplicativo/build/app/outputs/flutter-apk/app-release.apk. "
        "Não encontrei o comando flutter. [WinError 2]",
        "Compilação do APK",
        "build_apk",
    )
    assert "flutter" in card["problem"]
    assert "escritório" in card["solution"]
    assert card["action"] == "office"


def test_explain_stop_apk_com_erro_de_codigo_chama_o_agente():
    card = explain_stop(
        "flutter build apk --release não gerou aplicativo/build/app/outputs/flutter-apk/app-release.apk. "
        "Gradle task assembleRelease failed",
        "Compilação do APK",
        "build_apk",
    )
    assert "APK" in card["problem"]
    assert "Dev Frontend" in card["solution"]
    assert card["action"] == "agent"


def test_explain_stop_teste_que_ainda_falha():
    card = explain_stop(
        "O teste ainda falha depois da implementação. Código de saída 1. assertion",
        "Construção backend",
        "build_be",
    )
    assert "teste" in card["problem"].lower()
    assert "flutter" not in card["problem"]
    assert card["action"] == "agent"


def test_run_shell_usa_o_flutter_completo(monkeypatch):
    seen = {}

    def fake_run(args, **kwargs):
        seen["args"] = args

        class Proc:
            returncode = 0
            stdout = "ok"
            stderr = ""

        return Proc()

    monkeypatch.setattr("app.modules.factory.work_session.subprocess.run", fake_run)
    monkeypatch.setattr(
        "app.modules.factory.work_session.flutter_executable",
        lambda: r"C:\flutter\bin\flutter.bat",
    )
    code, _output = run_shell(Path("."), ["flutter", "build", "apk", "--release"])
    assert code == 0
    assert seen["args"][0].endswith("flutter.bat")
    assert resolve_command(["flutter", "test"])[0].endswith("flutter.bat")


def test_flutter_usa_o_caminho_do_ambiente(monkeypatch, tmp_path):
    monkeypatch.setattr(
        "app.modules.factory.work_session.shutil.which",
        lambda name: None,
    )
    monkeypatch.setenv("APPDATA", str(tmp_path))
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "local"))
    monkeypatch.setenv("USERPROFILE", str(tmp_path / "home"))
    dest = tmp_path / "FlutterFlow" / "flutterflow" / "flutter" / "bin"
    dest.mkdir(parents=True)
    (dest / "flutter.bat").write_text("@echo off\n", encoding="utf-8")
    assert flutter_executable() == str(dest / "flutter.bat")
