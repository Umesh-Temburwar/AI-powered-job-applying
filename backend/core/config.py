from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings parsed from environment variables."""

    APP_NAME: str = "Universal Job Apply Bot API"
    ENVIRONMENT: str = "development"  # development | production | test
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = 8001
    CANDIDATE_USER_ID: str = "0ff8ac23-96d8-419e-9cff-ffd3b3430f17"
    FRONTEND_ORIGINS: str | list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://universal-job-apply-bot.vercel.app",
    ]

    # Supabase Configuration (zhazioldgvjwodzjurzy). Set SERVICE_ROLE_KEY in backend/.env.
    SUPABASE_URL: str = "https://zhazioldgvjwodzjurzy.supabase.co"
    SUPABASE_ANON_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoYXppb2xkZ3Zqd29kemp1cnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MjQwMTksImV4cCI6MjEwOTAwMDAxOX0.68-yxr1y8CnxlIKPVdM-FwBOjKo6HnjQysliFLGchuw"
    SUPABASE_PUBLISHABLE_KEY: str = "sb_publishable_nXPvrTeMtW2QXqic9afN3A_P5G_Kpbf"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_SECRET_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Administrator Access Control
    ADMIN_EMAILS: str = "umeshtemburwar2002@gmail.com,utemburwar2002@gmail.com"

    @field_validator("FRONTEND_ORIGINS", mode="before")
    @classmethod
    def parse_frontend_origins(cls, value: str | list[str]) -> list[str]:
        default_prod = "https://universal-job-apply-bot.vercel.app"
        if isinstance(value, str):
            # Handles comma-separated values from environment strings
            origins = [origin.strip() for origin in value.split(",") if origin.strip()]
            if default_prod not in origins:
                origins.append(default_prod)
            return origins
        if isinstance(value, list):
            origins = list(value)
            if default_prod not in origins:
                origins.append(default_prod)
            return origins
        return value

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"

    @property
    def admin_email_list(self) -> list[str]:
        return [email.strip().lower() for email in self.ADMIN_EMAILS.split(",") if email.strip()]


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
