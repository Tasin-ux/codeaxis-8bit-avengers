"""add email_otps table

Revision ID: c9d1e2f3a4b5
Revises: a8b21268e970
Create Date: 2026-10-23 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c9d1e2f3a4b5'
down_revision = 'a8b21268e970'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_otps",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("purpose", sa.String(length=30), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_email_otps_email", "email_otps", ["email"])


def downgrade() -> None:
    op.drop_index("ix_email_otps_email", table_name="email_otps")
    op.drop_table("email_otps")
