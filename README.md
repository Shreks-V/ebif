# EBIF — Sistema de gestión (Espina Bífida)

Backend **FastAPI** + frontend **Angular**. Pruebas automatizadas con **pytest** (Sprint 1 y Sprint 2).

**Repositorio (rama con pruebas S1 + S2):**  
https://github.com/Shreks-V/EspinaBifidaS1/tree/Pruebas-S2

---

## Dónde ver las pruebas

| Qué | Dónde |
|-----|--------|
| **Resultados y test runs** (passed / failed / skipped, historial) | [Qase — proyecto FJ26SV](https://app.qase.io/run/FJ26SV) |
| **Código de las pruebas** | Carpetas [`Pruebas/`](Pruebas/) (Sprint 1, SV-*) y [`pruebas-s2/`](pruebas-s2/) (Sprint 2, HU-09 … HU-17) |
| **Informe resumido** (matrices, % automatización, capturas) | [`Pruebas/reporte-resumen-pruebas-ebif.html`](Pruebas/reporte-resumen-pruebas-ebif.html) (abrir en navegador → imprimir a PDF) |

Tras publicar en Qase (`QASE_MODE=testops`), la consola muestra el enlace al run concreto (`…/run/FJ26SV/dashboard/N`). La lista de todos los runs está en el enlace de la tabla.

---

## Requisitos

- **Python 3.12** (recomendado; usar el intérprete del sistema, no el de Cursor)
- Entorno virtual en `backend/.venv`
- Dependencias de prueba:

```bash
cd <raíz-del-repo>
python3 -m venv backend/.venv
source backend/.venv/bin/activate   # Windows: backend\.venv\Scripts\activate
pip install -U pip
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
```

---

## Ejecutar pruebas (local)

Siempre desde la **raíz del repositorio** (donde está `pytest.ini`):

```bash
source backend/.venv/bin/activate

# Sprint 1 (carpeta Pruebas/)
python -m pytest Pruebas/ -v

# Sprint 2 (carpeta pruebas-s2/)
python -m pytest pruebas-s2/ -v

# Todo (69 tests: 47 S1 + 22 S2)
python -m pytest Pruebas/ pruebas-s2/ -q
```

**Oracle opcional** (health check con app real; requiere `.env` y carpeta `wallet/` en la raíz):

```bash
EBIF_S2_USE_ORACLE=1 python -m pytest pruebas-s2/test_oracle_s2.py -v
```

Más ejemplos (un test, filtros `-k`, primer fallo `-x`): [`Pruebas/README.md`](Pruebas/README.md).

---

## Publicar resultados en Qase

Proyecto único **FJ26SV** para Sprint 1 y Sprint 2.

1. En [Qase](https://app.qase.io): Apps → **Pytest** → crear **Access token**.
2. En la raíz del repo:

```bash
export QASE_MODE=testops
export QASE_TESTOPS_API_TOKEN='tu_token'
export QASE_TESTOPS_PROJECT=FJ26SV

# Opcional: sincronizar casos Sprint 2 en Qase
python scripts/qase_sync_sprint2.py

python -m pytest Pruebas/ pruebas-s2/ -v
```

3. Revisa los runs en: https://app.qase.io/run/FJ26SV

---

## Estructura de pruebas

```
pytest.ini              # testpaths: Pruebas, pruebas-s2
Pruebas/                # Sprint 1 — criterios SV-*
pruebas-s2/             # Sprint 2 — HU-09 … HU-17
scripts/qase_sync_sprint2.py
qase.config.json        # proyecto FJ26SV
```

---

## Docker (app completa)

```bash
docker compose up --build
```

- Frontend: http://localhost  
- API: http://localhost:8000 (el front usa `/api/` vía nginx)

Configura `.env` en la raíz (copia de `.env.example`) y la carpeta `wallet/` para Oracle.

---

## Documentación

- [pytest](https://docs.pytest.org/)
- Informe de pruebas: `Pruebas/reporte-resumen-pruebas-ebif.md` / `.html`
