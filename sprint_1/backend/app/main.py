from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.database import init_pool, close_pool
from app.routers import auth, beneficiarios, citas, almacen, recibos, reportes, preregistro, doctores, exportaciones

# ──────────────── Rate Limiter ────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


# ──────────────── Lifespan (pool init/close) ────────────────
def _run_migrations():
    """Run lightweight DDL migrations on startup (idempotent)."""
    import logging
    logger = logging.getLogger(__name__)
    from app.core.database import get_db
    migrations = [
        "ALTER TABLE DISPONIBILIDAD_DOCTOR ADD (DIA_SEMANA NUMBER(1))",
        "ALTER TABLE EXISTENCIA_PRODUCTO ADD (FECHA_CADUCIDAD DATE)",
    ]
    with get_db() as conn:
        cur = conn.cursor()
        for ddl in migrations:
            try:
                cur.execute(ddl)
                conn.commit()
                logger.info("Migration OK: %s", ddl[:60])
            except Exception:
                pass  # Column already exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    _run_migrations()
    yield
    close_pool()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ──────────────── Security Headers Middleware ────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        # HSTS — instruct browsers to only use HTTPS (1 year)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # CSP — restrict resource origins
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)

# ──────────────── CORS ────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,
)

# ──────────────── Request Body Size Limit ────────────────
MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            return Response(
                content='{"detail":"Payload too large"}',
                status_code=413,
                media_type="application/json",
            )
        return await call_next(request)


app.add_middleware(RequestSizeLimitMiddleware)

# ──────────────── Routers ────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(beneficiarios.router, prefix="/api/beneficiarios", tags=["Beneficiarios"])
app.include_router(citas.router, prefix="/api/citas", tags=["Citas"])
app.include_router(almacen.router, prefix="/api/almacen", tags=["Almacén"])
app.include_router(recibos.router, prefix="/api/recibos", tags=["Recibos"])
app.include_router(reportes.router, prefix="/api/reportes", tags=["Reportes"])
app.include_router(preregistro.router, prefix="/api/preregistro", tags=["Pre-Registro"])
app.include_router(doctores.router, prefix="/api/doctores", tags=["Doctores"])
app.include_router(exportaciones.router, prefix="/api/exportaciones", tags=["Exportaciones"])


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
