from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    APP_NAME: str = "AICTE Smart Document Management Platform"
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: str = "your-super-secret-key-change-in-production-minimum-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DATABASE_URL: str = "sqlite:///./aicte_platform.db"
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "jpg", "jpeg", "png"]
    TESSERACT_CMD: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
