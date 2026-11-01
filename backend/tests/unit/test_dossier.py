from app.modules.factory.dossier import collect_evidence, parse_roteiro, verdict_of


def test_veredito_do_log():
    assert verdict_of("comando: flutter test\nexecucao: passou\ncodigo_saida: 0\n") == "pass"
    assert verdict_of("execucao: falhou\ncodigo_saida: 1\n") == "fail"
    assert verdict_of("fase teste: falhou\ncodigo_saida: 1\n\nfase codigo: passou\ncodigo_saida: 0\n") == "pass"
    assert verdict_of("sem execução") == "wait"


def test_evidencia_separa_html_print_e_falha(tmp_path):
    qa = tmp_path / "qa" / "evidence"
    qa.mkdir(parents=True)
    (qa / "qa_fe.log").write_text("execucao: passou\n", encoding="utf-8")
    (qa / "falha.png").write_bytes(b"\x89PNG\r\n")
    (tmp_path / "qa" / "relatorio.html").write_text("<p>ok</p>", encoding="utf-8")
    (tmp_path / "qa" / "orders" / "pedido-atual.md").parent.mkdir()
    (tmp_path / "qa" / "orders" / "pedido-atual.md").write_text("pedido", encoding="utf-8")

    items = collect_evidence(tmp_path, scope="qa")
    by_name = {item["name"]: item for item in items}
    assert by_name["qa_fe.log"]["status"] == "pass"
    assert by_name["qa_fe.log"]["kind"] == "log"
    assert by_name["falha.png"]["kind"] == "screenshot"
    assert by_name["falha.png"]["status"] == "fail"
    assert by_name["relatorio.html"]["kind"] == "html"
    assert "pedido-atual.md" not in by_name


def test_roteiro_do_especialista():
    items = parse_roteiro("- [x] Segredo | conferir aplicativo/\n- [ ] Login | ainda sem prova\n")
    assert items[0]["status"] == "pass"
    assert items[1]["title"] == "Login"
    assert items[1]["status"] == "wait"
