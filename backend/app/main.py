"""Main FastAPI application for BrandGuard AI."""

import os
# Ensure pure-python fallback for SQLAlchemy
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# Import all models to ensure they are registered with Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Create SQLite database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="BrandGuard AI API",
    description="AI-assisted brand governance platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if not origins:
    origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
def health_check():
    return {
        "status": "healthy",
        "service": "BrandGuard AI",
        "version": "1.0.0",
        "ai_enabled": bool(settings.AI_API_KEY and settings.AI_PROVIDER != "none"),
    }
