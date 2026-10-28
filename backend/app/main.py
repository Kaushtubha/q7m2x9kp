"""
WindLens FastAPI application entry point.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.api import router as api_router

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="WindLens API",
    description=(
        "Day-ahead wind forecast intelligence for UK electricity procurement analysts. "
        "Data sourced from Elexon BMRS (FUELHH actuals + WINDFOR forecasts). "
        "Scope: January 2026."
    ),
    version="1.0.0",
)

origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


app.include_router(api_router)


@app.get("/health", tags=["infrastructure"])
def health() -> dict:
    return {
        "status": "ok",
        "service": "windlens-backend",
        "default_cutoff_hour_utc": settings.default_cutoff_hour,
        "note": "Cutoff hour is a configurable assumption, not an official market rule.",
    }
