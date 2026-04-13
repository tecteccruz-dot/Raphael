from app.servicios.lmstudio import respuesta_turno_es_valida


def test_respuesta_ia_con_accion_imperfecta_sigue_siendo_valida():
    respuesta = {
        "narracion": "Jan aprovecha la distraccion de Gwen e intenta robarle unas monedas.",
        "resumen_delta": "Jan intenta sustraer dinero de Gwen.",
        "fin_de_turno": True,
        "acciones": [
            {
                "tipo": "estado",
                "objetivo": "npc_05271532",
                "nombre": "Agredido/Sorprendido",
                "control": "ia",
            }
        ],
    }

    ok, motivo = respuesta_turno_es_valida(respuesta)

    assert ok is True
    assert motivo == ""


def test_respuesta_ia_sin_narracion_sigue_siendo_invalida():
    respuesta = {
        "narracion": "",
        "resumen_delta": "",
        "fin_de_turno": True,
        "acciones": [],
    }

    ok, motivo = respuesta_turno_es_valida(respuesta)

    assert ok is False
    assert motivo == "La narracion viene vacia."
