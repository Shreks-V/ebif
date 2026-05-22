# Pruebas automatizadas (pytest)

Guía detallada de la carpeta `Pruebas/`. Para visión general, enlaces a **Qase** y clon del repo, ver el [**README de la raíz**](../README.md).

**Repositorio:** https://github.com/Shreks-V/EspinaBifidaS1/tree/Pruebas-S2  
**Ver test runs en Qase:** https://app.qase.io/run/FJ26SV

La configuración está en [`pytest.ini`](../pytest.ini) (`pythonpath = backend .`, `testpaths = Pruebas, pruebas-s2`). **Ejecuta siempre desde la raíz del repo**, con `backend/.venv` activado:

```bash
python -m pytest    # no uses python3 del sistema si no tiene las dependencias
```

---

## Instalación rápida

```bash
cd <raíz-del-repo>
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements-dev.txt
```

---

## Comandos habituales

| Objetivo | Comando |
|----------|---------|
| Solo Sprint 1 | `python -m pytest Pruebas/ -v` |
| Solo Sprint 2 | `python -m pytest pruebas-s2/ -v` |
| S1 + S2 | `python -m pytest Pruebas/ pruebas-s2/ -q` |
| Un archivo | `python -m pytest Pruebas/test_recibos.py -v` |
| Un test | `python -m pytest Pruebas/test_recibos.py::test_sv44_listar_recibos -v` |
| Filtro por nombre | `python -m pytest Pruebas/ -k "recibos" -v` |
| Parar en primer fallo | `python -m pytest Pruebas/ -x` |

### Sprint 2 + Oracle

```bash
EBIF_S2_USE_ORACLE=1 python -m pytest pruebas-s2/test_oracle_s2.py -v
```

### Publicar en Qase

```bash
export QASE_MODE=testops
export QASE_TESTOPS_API_TOKEN='tu_token'
export QASE_TESTOPS_PROJECT=FJ26SV
python scripts/qase_sync_sprint2.py
python -m pytest Pruebas/ pruebas-s2/ -v
```

---

## Módulos Sprint 1 (`Pruebas/`)

| Archivo | Referencia |
|---------|------------|
| `test_acceso_sesion.py` | SV-1 … SV-6 |
| `test_beneficiarios.py` | SV-7 … SV-17 |
| `test_preregistro.py` | SV-24 … SV-30 |
| `test_citas.py` | SV-31 … SV-35, SV-37 |
| `test_acciones_rapidas.py` | SV-38 … SV-43 (SV-40–42 skip E2E) |
| `test_recibos.py` | SV-44 … SV-50 |

Sprint 2: carpeta [`../pruebas-s2/`](../pruebas-s2/) (HU-09 … HU-17).

---

## Informe y evidencias

- [`reporte-resumen-pruebas-ebif.html`](reporte-resumen-pruebas-ebif.html) — informe para entrega (PDF vía imprimir en navegador)
- [`reporte-resumen-pruebas-ebif.md`](reporte-resumen-pruebas-ebif.md)
- [`evidencias/`](evidencias/) — capturas de ejecución pytest

---

## Notas

- **`conftest.py`**: fixtures compartidas; `support_*.py` son mocks en memoria.
- **Skips**: SV-40…42 (E2E); en S2, CURP duplicado API y Oracle sin `EBIF_S2_USE_ORACLE=1`.
- **Qase `layer`**: solo `api`, `e2e`, `unit`, `unknown` (minúsculas).
