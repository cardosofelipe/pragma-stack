"""add_organizations_and_user_organizations

Revision ID: fbf6318a8a36
Revises: 549b50ea888d
Create Date: 2025-10-31 12:08:05.141353

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fbf6318a8a36'
down_revision: Union[str, None] = '549b50ea888d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create organizations table
    op.create_table(
        'organizations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for organizations
    op.create_index('ix_organizations_name', 'organizations', ['name'])
    op.create_index('ix_organizations_slug', 'organizations', ['slug'], unique=True)
    op.create_index('ix_organizations_is_active', 'organizations', ['is_active'])
    op.create_index('ix_organizations_name_active', 'organizations', ['name', 'is_active'])
    op.create_index('ix_organizations_slug_active', 'organizations', ['slug', 'is_active'])

    # Create user_organizations junction table
    op.create_table(
        'user_organizations',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('role', sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'GUEST', name='organizationrole'), nullable=False, server_default='MEMBER'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('custom_permissions', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('user_id', 'organization_id')
    )

    # Create foreign keys
    op.create_foreign_key(
        'fk_user_organizations_user_id',
        'user_organizations',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_user_organizations_organization_id',
        'user_organizations',
        'organizations',
        ['organization_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Create indexes for user_organizations
    op.create_index('ix_user_organizations_role', 'user_organizations', ['role'])
    op.create_index('ix_user_organizations_is_active', 'user_organizations', ['is_active'])
    op.create_index('ix_user_org_user_active', 'user_organizations', ['user_id', 'is_active'])
    op.create_index('ix_user_org_org_active', 'user_organizations', ['organization_id', 'is_active'])


def downgrade() -> None:
    # Drop indexes for user_organizations
    op.drop_index('ix_user_org_org_active', table_name='user_organizations')
    op.drop_index('ix_user_org_user_active', table_name='user_organizations')
    op.drop_index('ix_user_organizations_is_active', table_name='user_organizations')
    op.drop_index('ix_user_organizations_role', table_name='user_organizations')

    # Drop foreign keys
    op.drop_constraint('fk_user_organizations_organization_id', 'user_organizations', type_='foreignkey')
    op.drop_constraint('fk_user_organizations_user_id', 'user_organizations', type_='foreignkey')

    # Drop user_organizations table
    op.drop_table('user_organizations')

    # Drop indexes for organizations
    op.drop_index('ix_organizations_slug_active', table_name='organizations')
    op.drop_index('ix_organizations_name_active', table_name='organizations')
    op.drop_index('ix_organizations_is_active', table_name='organizations')
    op.drop_index('ix_organizations_slug', table_name='organizations')
    op.drop_index('ix_organizations_name', table_name='organizations')

    # Drop organizations table
    op.drop_table('organizations')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS organizationrole')
