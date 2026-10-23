"""Database seed script for BrandGuard AI development and testing."""

import os
import sys
from pathlib import Path

# Ensure pure-python fallback for SQLAlchemy when C-extensions are blocked by AppLocker/Application Control
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.brand import Brand
from app.models.disclaimer import RequiredDisclaimer
from app.models.fact import ApprovedFact
from app.models.guideline import BrandGuideline
from app.models.prohibited_phrase import ProhibitedPhrase
from app.models.submission import ContentSubmission, SubmissionRevision
from app.models.terminology import ApprovedTerminology
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership


def seed_database():
    print("Creating tables if not present...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        admin_user = db.query(User).filter(User.email == "admin@brandguard.ai").first()
        if admin_user:
            print("Database already contains seed data. Skipping seed.")
            return

        print("Seeding demo users...")
        admin = User(
            email="admin@brandguard.ai",
            username="admin",
            full_name="Alex Administrator",
            hashed_password=hash_password("Demo123!@#"),
            is_active=True,
        )
        creator = User(
            email="creator@brandguard.ai",
            username="creator",
            full_name="Casey Creator",
            hashed_password=hash_password("Demo123!@#"),
            is_active=True,
        )
        db.add_all([admin, creator])
        db.flush()

        print("Seeding workspace...")
        workspace = Workspace(
            name="Acme Corp Marketing",
            slug="acme-corp",
            description="Official brand governance workspace for Acme Corporation",
            created_by=admin.id,
        )
        db.add(workspace)
        db.flush()

        # Memberships
        admin_membership = WorkspaceMembership(
            workspace_id=workspace.id,
            user_id=admin.id,
            role="admin",
        )
        creator_membership = WorkspaceMembership(
            workspace_id=workspace.id,
            user_id=creator.id,
            role="creator",
        )
        db.add_all([admin_membership, creator_membership])
        db.flush()

        print("Seeding brand...")
        brand = Brand(
            workspace_id=workspace.id,
            name="Acme Cloud Platform",
            description="Enterprise cloud services and collaborative tools",
            is_active=True,
        )
        db.add(brand)
        db.flush()

        print("Seeding brand guidelines...")
        guidelines = [
            BrandGuideline(
                workspace_id=workspace.id,
                brand_id=brand.id,
                title="Professional and approachable tone",
                description="Use clear, confident language. Avoid exaggerated claims and unnecessary technical jargon.",
                category="Tone & Voice",
                severity="medium",
                is_active=True,
            ),
            BrandGuideline(
                workspace_id=workspace.id,
                brand_id=brand.id,
                title="Data privacy and compliance claims",
                description="Never promise absolute security or compliance without specific references to certified audit reports.",
                category="Legal & Compliance",
                severity="critical",
                is_active=True,
            ),
            BrandGuideline(
                workspace_id=workspace.id,
                brand_id=brand.id,
                title="Inclusive communication",
                description="Use inclusive, accessible terms and ensure all content respects diversity across global audiences.",
                category="Style",
                severity="medium",
                is_active=True,
            ),
            BrandGuideline(
                workspace_id=workspace.id,
                brand_id=brand.id,
                title="Competitor comparisons",
                description="Do not name competitors or disparage competitor offerings in public promotional copy.",
                category="Competitive",
                severity="high",
                is_active=True,
            ),
            BrandGuideline(
                workspace_id=workspace.id,
                brand_id=brand.id,
                title="Forward-looking statements disclaimer",
                description="Explicitly qualify any statements about upcoming features with roadmap disclaimer text.",
                category="Product",
                severity="medium",
                is_active=True,
            ),
        ]
        db.add_all(guidelines)

        print("Seeding approved terminology...")
        terminology = [
            ApprovedTerminology(
                workspace_id=workspace.id,
                preferred_term="customer",
                disallowed_term="consumer",
                explanation="We value long-term partnerships; refer to our users as customers rather than consumers.",
                case_sensitive=False,
                is_active=True,
            ),
            ApprovedTerminology(
                workspace_id=workspace.id,
                preferred_term="application",
                disallowed_term="app",
                explanation="In enterprise marketing, use 'application' instead of the casual 'app'.",
                case_sensitive=False,
                is_active=True,
            ),
            ApprovedTerminology(
                workspace_id=workspace.id,
                preferred_term="collaborator",
                disallowed_term="vendor",
                explanation="We treat our technology suppliers as strategic collaborators.",
                case_sensitive=False,
                is_active=True,
            ),
            ApprovedTerminology(
                workspace_id=workspace.id,
                preferred_term="sign in",
                disallowed_term="log into",
                explanation="Standardize user authentication terminology to 'sign in'.",
                case_sensitive=False,
                is_active=True,
            ),
            ApprovedTerminology(
                workspace_id=workspace.id,
                preferred_term="knowledge base",
                disallowed_term="KB",
                explanation="Spell out 'knowledge base' to prevent confusion for non-technical users.",
                case_sensitive=False,
                is_active=True,
            ),
        ]
        db.add_all(terminology)

        print("Seeding prohibited phrases...")
        phrases = [
            ProhibitedPhrase(
                workspace_id=workspace.id,
                phrase="guarantees results",
                reason="Unsupported absolute promotional claim that creates compliance liability.",
                severity="high",
                suggested_alternative="designed to help achieve measurable results",
                case_sensitive=False,
                whole_word=True,
                is_active=True,
            ),
            ProhibitedPhrase(
                workspace_id=workspace.id,
                phrase="#1 solution",
                reason="Unsubstantiated market leadership claim without independent ranking citation.",
                severity="critical",
                suggested_alternative="industry-leading solution",
                case_sensitive=False,
                whole_word=True,
                is_active=True,
            ),
            ProhibitedPhrase(
                workspace_id=workspace.id,
                phrase="100% fraud prevention",
                reason="Absolute security guarantees are legally inaccurate and strictly prohibited.",
                severity="critical",
                suggested_alternative="multi-layered fraud defense",
                case_sensitive=False,
                whole_word=True,
                is_active=True,
            ),
            ProhibitedPhrase(
                workspace_id=workspace.id,
                phrase="unlimited storage",
                reason="Storage usage is governed by our fair use policy and is not technically unlimited.",
                severity="high",
                suggested_alternative="scalable enterprise storage",
                case_sensitive=False,
                whole_word=True,
                is_active=True,
            ),
            ProhibitedPhrase(
                workspace_id=workspace.id,
                phrase="zero downtime",
                reason="SLA guarantees 99.99% availability, not absolute zero downtime.",
                severity="medium",
                suggested_alternative="99.99% service availability commitment",
                case_sensitive=False,
                whole_word=True,
                is_active=True,
            ),
        ]
        db.add_all(phrases)

        print("Seeding required disclaimers...")
        disclaimers = [
            RequiredDisclaimer(
                workspace_id=workspace.id,
                text="Results may vary based on deployment configuration and network environment.",
                content_category="marketing_copy",
                severity="high",
                is_active=True,
            ),
            RequiredDisclaimer(
                workspace_id=workspace.id,
                text="Features mentioned are subject to regional availability and licensing tier.",
                content_category="product_description",
                severity="medium",
                is_active=True,
            ),
        ]
        db.add_all(disclaimers)

        print("Seeding approved facts...")
        facts = [
            ApprovedFact(
                workspace_id=workspace.id,
                title="Product availability",
                statement="The product is currently available in selected regions including North America and Europe.",
                source_reference="Approved product information sheet 2026-Q1",
                source_type="datasheet",
                source_url="https://acme.example.com/docs/availability",
                verification_status="verified",
                product_or_campaign="Acme Cloud Platform",
                is_active=True,
            ),
            ApprovedFact(
                workspace_id=workspace.id,
                title="SOC 2 Type II Certification",
                statement="Acme Cloud Platform is SOC 2 Type II certified as of January 2026.",
                source_reference="Compliance Audit Report 2026",
                source_type="audit_report",
                source_url="https://acme.example.com/compliance/soc2",
                verification_status="verified",
                product_or_campaign="Acme Cloud Platform",
                is_active=True,
            ),
            ApprovedFact(
                workspace_id=workspace.id,
                title="Enterprise SLA",
                statement="Enterprise tier includes a 99.99% uptime service level agreement.",
                source_reference="Master Service Agreement v4.2",
                source_type="legal",
                source_url=None,
                verification_status="verified",
                product_or_campaign="Enterprise Tier",
                is_active=True,
            ),
            ApprovedFact(
                workspace_id=workspace.id,
                title="Data Center Regions",
                statement="Primary data centers are located in US-East, US-West, and EU-Central.",
                source_reference="Infrastructure Architecture v3.1",
                source_type="specifications",
                source_url=None,
                verification_status="verified",
                product_or_campaign="Infrastructure",
                is_active=True,
            ),
            ApprovedFact(
                workspace_id=workspace.id,
                title="Migration Tool Preview",
                statement="The legacy migration assistant is currently in private preview for selected customers.",
                source_reference="Release Notes 2025-11",
                source_type="release_notes",
                source_url=None,
                verification_status="verified",
                product_or_campaign="Migration Tools",
                is_active=True,
            ),
        ]
        db.add_all(facts)

        print("Seeding sample content submissions...")
        # Scenario A: Clean submission
        clean_sub = ContentSubmission(
            workspace_id=workspace.id,
            brand_id=brand.id,
            author_id=creator.id,
            title="Q2 Enterprise Cloud Launch Announcement",
            content="Our application helps teams organise their daily work and manage project updates. Results may vary based on deployment configuration and network environment.",
            content_type="marketing_copy",
            status="draft",
            current_revision_number=1,
        )
        db.add(clean_sub)
        db.flush()

        db.add(
            SubmissionRevision(
                submission_id=clean_sub.id,
                revision_number=1,
                content=clean_sub.content,
                summary="Initial compliant draft",
                author_id=creator.id,
                status_at_creation="draft",
            )
        )

        # Scenario B: Violation submission
        violation_sub = ContentSubmission(
            workspace_id=workspace.id,
            brand_id=brand.id,
            author_id=creator.id,
            title="Social Campaign Draft (Needs Review)",
            content="Our application guarantees results for every customer. Download the new app today to get unlimited storage and zero downtime!",
            content_type="marketing_copy",
            status="draft",
            current_revision_number=1,
        )
        db.add(violation_sub)
        db.flush()

        db.add(
            SubmissionRevision(
                submission_id=violation_sub.id,
                revision_number=1,
                content=violation_sub.content,
                summary="Draft containing marketing claims for review",
                author_id=creator.id,
                status_at_creation="draft",
            )
        )

        db.commit()
        print("Database seeded successfully!")
        print("Demo Accounts:")
        print("  Admin:   admin@brandguard.ai   / Demo123!@#")
        print("  Creator: creator@brandguard.ai / Demo123!@#")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
