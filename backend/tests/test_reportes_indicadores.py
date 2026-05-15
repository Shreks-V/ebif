from app.infrastructure.reportes.repository import _curp_es_nl, _genero_label


def test_curp_es_nl_uses_curp_entity_code():
    assert _curp_es_nl("GALJ980514HNLRPN09") is True
    assert _curp_es_nl("AABA010101HBCBCD09") is False


def test_genero_label_accepts_current_and_seed_values():
    assert _genero_label("H") == "Hombre"
    assert _genero_label("Masculino") == "Hombre"
    assert _genero_label("M") == "Mujer"
    assert _genero_label("Femenino") == "Mujer"
