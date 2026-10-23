"""V1 API Router combining all sub-routers."""

from fastapi import APIRouter

from app.api.v1.analytics import router as analytics_router
from app.api.v1.auth import router as auth_router
from app.api.v1.brands import router as brands_router
from app.api.v1.comments import router as comments_router
from app.api.v1.disclaimers import router as disclaimers_router
from app.api.v1.facts import router as facts_router
from app.api.v1.guidelines import router as guidelines_router
from app.api.v1.prohibited_phrases import router as prohibited_phrases_router
from app.api.v1.submissions import router as submissions_router
from app.api.v1.terminology import router as terminology_router
from app.api.v1.workspaces import router as workspaces_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(workspaces_router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(brands_router, prefix="/brands", tags=["brands"])
api_router.include_router(guidelines_router, prefix="/guidelines", tags=["guidelines"])
api_router.include_router(terminology_router, prefix="/terminology", tags=["terminology"])
api_router.include_router(
    prohibited_phrases_router,
    prefix="/prohibited-phrases",
    tags=["prohibited-phrases"],
)
api_router.include_router(
    disclaimers_router, prefix="/disclaimers", tags=["disclaimers"]
)
api_router.include_router(facts_router, prefix="/facts", tags=["facts"])
api_router.include_router(submissions_router)
api_router.include_router(comments_router)
api_router.include_router(analytics_router)
