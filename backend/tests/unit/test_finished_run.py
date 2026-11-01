from app.modules.factory.run_service import empty_restart_after_finish


def test_corrida_vazia_nao_substitui_projeto_finalizado():
    assert empty_restart_after_finish(0) is True


def test_corrida_com_etapa_concluida_permanece_visivel():
    assert empty_restart_after_finish(3) is False
