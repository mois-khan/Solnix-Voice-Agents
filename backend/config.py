from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SARVAM_API_KEY: str
    GEMINI_API_KEY: str
    CORS_ORIGIN: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
