from pydantic import BaseModel


class Settings(BaseModel):
    APP_NAME: str = "Sistema Espina Bífida API"
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: str = "espina-bifida-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    CORS_ORIGINS: list[str] = ["http://localhost:4200"]

    # Oracle DB
    ORACLE_USER: str = "ADMIN"
    ORACLE_PASSWORD: str = "ZN9LjzV+#sUfqM."
    ORACLE_DSN: str = "fz0fv0yxld4qn44r_low"
    ORACLE_CLIENT_DIR: str = "/Users/maantora/Downloads/instantclient_23_3"
    ORACLE_CONFIG_DIR: str = "/Users/maantora/Downloads/Wallet_FZ0FV0YXLD4QN44R (3)"
    ORACLE_WALLET_DIR: str = "/Users/maantora/Downloads/Wallet_FZ0FV0YXLD4QN44R (3)"
    ORACLE_WALLET_PASSWORD: str = "ZN9LjzV+#sUfqM."


settings = Settings()
