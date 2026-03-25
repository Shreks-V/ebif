from pydantic import BaseModel


class Settings(BaseModel):
    APP_NAME: str = "Sistema Espina Bífida API"
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: str = "espina-bifida-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    CORS_ORIGINS: list[str] = ["http://localhost:4200"]


settings = Settings()
