from pydantic_settings import BaseSettings
from typing import List
import secrets


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "dYdX Alert"
    VERSION: str = "1.0.0"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    ENABLE_MONITOR: bool = True
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8021

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str = ""

    # Database
    DATABASE_URL: str

    # dYdX v4
    DYDX_INDEXER_REST_URL: str = "https://indexer.dydx.trade/v4"
    DYDX_INDEXER_WS_URL: str = "wss://indexer.dydx.trade/v4/ws"
    DYDX_NETWORK: str = "mainnet"

    # Notifications
    TELEGRAM_BOT_TOKEN: str = ""
    DISCORD_BOT_TOKEN: str = ""
    PAGERDUTY_API_KEY: str = ""

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@dydxalerts.com"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Alert Settings
    DEFAULT_LIQUIDATION_THRESHOLD: float = 10.0  # % away from liquidation
    ALERT_COOLDOWN_SECONDS: int = 300  # 5 minutes

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
