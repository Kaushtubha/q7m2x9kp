"""
Application configuration loaded from environment variables.
Copy .env.example to .env and adjust values for local development.
"""

from __future__ import annotations
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, Field


class Settings(BaseSettings):
    # Elexon BMRS API base URL (no trailing slash)
    elexon_base_url: str = Field(
        default="https://data.elexon.co.uk/bmrs/api/v1",
        alias="ELEXON_BASE_URL",
    )

    # Default decision cutoff hour (UTC) on D-1.
    # ASSUMPTION: not an official Gridbricks or market rule.
    # The challenge does not specify a cutoff. 11:00 UTC is a conservative
    # pre-noon default matching a published WINDFOR run (09:30 or 11:30 UTC).
    default_cutoff_hour: int = Field(default=11, alias="DEFAULT_CUTOFF_HOUR")

    # CORS origins: comma-separated string, split at startup
    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        alias="ALLOWED_ORIGINS",
    )

    # HTTP client timeouts in seconds
    http_connect_timeout: float = 10.0
    http_read_timeout: float = 30.0

    model_config = ConfigDict(env_file=".env", populate_by_name=True)


settings = Settings()
