from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, beneficiarios, citas, almacen, recibos, reportes, preregistro, doctores

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(beneficiarios.router, prefix="/api/beneficiarios", tags=["Beneficiarios"])
app.include_router(citas.router, prefix="/api/citas", tags=["Citas"])
app.include_router(almacen.router, prefix="/api/almacen", tags=["Almacén"])
app.include_router(recibos.router, prefix="/api/recibos", tags=["Recibos"])
app.include_router(reportes.router, prefix="/api/reportes", tags=["Reportes"])
app.include_router(preregistro.router, prefix="/api/preregistro", tags=["Pre-Registro"])
app.include_router(doctores.router, prefix="/api/doctores", tags=["Doctores"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
