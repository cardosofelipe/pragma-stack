# tests/crud/test_organization_async.py
"""
Comprehensive tests for async organization CRUD operations.
"""
import pytest
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.organization import organization as organization_crud
from app.models.organization import Organization
from app.models.user_organization import UserOrganization, OrganizationRole
from app.models.user import User
from app.schemas.organizations import OrganizationCreate, OrganizationUpdate


class TestGetBySlug:
    """Tests for get_by_slug method."""

    @pytest.mark.asyncio
    async def test_get_by_slug_success(self, async_test_db):
        """Test successfully getting an organization by slug."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organization
        async with AsyncTestingSessionLocal() as session:
            org = Organization(
                name="Test Org",
                slug="test-org",
                description="Test description"
            )
            session.add(org)
            await session.commit()
            org_id = org.id

        # Get by slug
        async with AsyncTestingSessionLocal() as session:
            result = await organization_crud.get_by_slug(session, slug="test-org")
            assert result is not None
            assert result.id == org_id
            assert result.slug == "test-org"

    @pytest.mark.asyncio
    async def test_get_by_slug_not_found(self, async_test_db):
        """Test getting non-existent organization by slug."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            result = await organization_crud.get_by_slug(session, slug="nonexistent")
            assert result is None


class TestCreate:
    """Tests for create method."""

    @pytest.mark.asyncio
    async def test_create_success(self, async_test_db):
        """Test successfully creating an organization_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org_in = OrganizationCreate(
                name="New Org",
                slug="new-org",
                description="New organization",
                is_active=True,
                settings={"key": "value"}
            )
            result = await organization_crud.create(session, obj_in=org_in)

            assert result.name == "New Org"
            assert result.slug == "new-org"
            assert result.description == "New organization"
            assert result.is_active is True
            assert result.settings == {"key": "value"}

    @pytest.mark.asyncio
    async def test_create_duplicate_slug(self, async_test_db):
        """Test creating organization with duplicate slug raises error."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create first org
        async with AsyncTestingSessionLocal() as session:
            org1 = Organization(name="Org 1", slug="duplicate-slug")
            session.add(org1)
            await session.commit()

        # Try to create second with same slug
        async with AsyncTestingSessionLocal() as session:
            org_in = OrganizationCreate(
                name="Org 2",
                slug="duplicate-slug"
            )
            with pytest.raises(ValueError, match="already exists"):
                await organization_crud.create(session, obj_in=org_in)

    @pytest.mark.asyncio
    async def test_create_without_settings(self, async_test_db):
        """Test creating organization without settings (defaults to empty dict)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org_in = OrganizationCreate(
                name="No Settings Org",
                slug="no-settings"
            )
            result = await organization_crud.create(session, obj_in=org_in)

            assert result.settings == {}


class TestGetMultiWithFilters:
    """Tests for get_multi_with_filters method."""

    @pytest.mark.asyncio
    async def test_get_multi_with_filters_no_filters(self, async_test_db):
        """Test getting organizations without any filters."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        # Create test organizations
        async with AsyncTestingSessionLocal() as session:
            for i in range(5):
                org = Organization(name=f"Org {i}", slug=f"org-{i}")
                session.add(org)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs, total = await organization_crud.get_multi_with_filters(session)
            assert total == 5
            assert len(orgs) == 5

    @pytest.mark.asyncio
    async def test_get_multi_with_filters_is_active(self, async_test_db):
        """Test filtering by is_active."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org1 = Organization(name="Active", slug="active", is_active=True)
            org2 = Organization(name="Inactive", slug="inactive", is_active=False)
            session.add_all([org1, org2])
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs, total = await organization_crud.get_multi_with_filters(
                session,
                is_active=True
            )
            assert total == 1
            assert orgs[0].name == "Active"

    @pytest.mark.asyncio
    async def test_get_multi_with_filters_search(self, async_test_db):
        """Test searching organizations."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org1 = Organization(name="Tech Corp", slug="tech-corp", description="Technology")
            org2 = Organization(name="Food Inc", slug="food-inc", description="Restaurant")
            session.add_all([org1, org2])
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs, total = await organization_crud.get_multi_with_filters(
                session,
                search="tech"
            )
            assert total == 1
            assert orgs[0].name == "Tech Corp"

    @pytest.mark.asyncio
    async def test_get_multi_with_filters_pagination(self, async_test_db):
        """Test pagination."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            for i in range(10):
                org = Organization(name=f"Org {i}", slug=f"org-{i}")
                session.add(org)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs, total = await organization_crud.get_multi_with_filters(
                session,
                skip=2,
                limit=3
            )
            assert total == 10
            assert len(orgs) == 3

    @pytest.mark.asyncio
    async def test_get_multi_with_filters_sorting(self, async_test_db):
        """Test sorting."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org1 = Organization(name="B Org", slug="b-org")
            org2 = Organization(name="A Org", slug="a-org")
            session.add_all([org1, org2])
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs, total = await organization_crud.get_multi_with_filters(
                session,
                sort_by="name",
                sort_order="asc"
            )
            assert orgs[0].name == "A Org"
            assert orgs[1].name == "B Org"


class TestGetMemberCount:
    """Tests for get_member_count method."""

    @pytest.mark.asyncio
    async def test_get_member_count_success(self, async_test_db, async_test_user):
        """Test getting member count for organization_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            # Add 1 active member
            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            count = await organization_crud.get_member_count(session, organization_id=org_id)
            assert count == 1

    @pytest.mark.asyncio
    async def test_get_member_count_no_members(self, async_test_db):
        """Test getting member count for organization with no members."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Empty Org", slug="empty-org")
            session.add(org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            count = await organization_crud.get_member_count(session, organization_id=org_id)
            assert count == 0


class TestAddUser:
    """Tests for add_user method."""

    @pytest.mark.asyncio
    async def test_add_user_success(self, async_test_db, async_test_user):
        """Test successfully adding a user to organization_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            result = await organization_crud.add_user(
                session,
                organization_id=org_id,
                user_id=async_test_user.id,
                role=OrganizationRole.ADMIN
            )

            assert result.user_id == async_test_user.id
            assert result.organization_id == org_id
            assert result.role == OrganizationRole.ADMIN
            assert result.is_active is True

    @pytest.mark.asyncio
    async def test_add_user_already_active_member(self, async_test_db, async_test_user):
        """Test adding user who is already an active member raises error."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(ValueError, match="already a member"):
                await organization_crud.add_user(
                    session,
                    organization_id=org_id,
                    user_id=async_test_user.id
                )

    @pytest.mark.asyncio
    async def test_add_user_reactivate_inactive(self, async_test_db, async_test_user):
        """Test adding user who was previously inactive reactivates them."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=False
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            result = await organization_crud.add_user(
                session,
                organization_id=org_id,
                user_id=async_test_user.id,
                role=OrganizationRole.ADMIN
            )

            assert result.is_active is True
            assert result.role == OrganizationRole.ADMIN


class TestRemoveUser:
    """Tests for remove_user method."""

    @pytest.mark.asyncio
    async def test_remove_user_success(self, async_test_db, async_test_user):
        """Test successfully removing a user from organization_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            result = await organization_crud.remove_user(
                session,
                organization_id=org_id,
                user_id=async_test_user.id
            )

            assert result is True

        # Verify soft delete
        async with AsyncTestingSessionLocal() as session:
            stmt = select(UserOrganization).where(
                UserOrganization.user_id == async_test_user.id,
                UserOrganization.organization_id == org_id
            )
            result = await session.execute(stmt)
            user_org = result.scalar_one_or_none()
            assert user_org.is_active is False

    @pytest.mark.asyncio
    async def test_remove_user_not_found(self, async_test_db):
        """Test removing non-existent user returns False."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            result = await organization_crud.remove_user(
                session,
                organization_id=org_id,
                user_id=uuid4()
            )

            assert result is False


class TestUpdateUserRole:
    """Tests for update_user_role method."""

    @pytest.mark.asyncio
    async def test_update_user_role_success(self, async_test_db, async_test_user):
        """Test successfully updating user role."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            result = await organization_crud.update_user_role(
                session,
                organization_id=org_id,
                user_id=async_test_user.id,
                role=OrganizationRole.ADMIN,
                custom_permissions="custom"
            )

            assert result.role == OrganizationRole.ADMIN
            assert result.custom_permissions == "custom"

    @pytest.mark.asyncio
    async def test_update_user_role_not_found(self, async_test_db):
        """Test updating role for non-existent user returns None."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            result = await organization_crud.update_user_role(
                session,
                organization_id=org_id,
                user_id=uuid4(),
                role=OrganizationRole.ADMIN
            )

            assert result is None


class TestGetOrganizationMembers:
    """Tests for get_organization_members method."""

    @pytest.mark.asyncio
    async def test_get_organization_members_success(self, async_test_db, async_test_user):
        """Test getting organization members."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.ADMIN,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            members, total = await organization_crud.get_organization_members(
                session,
                organization_id=org_id
            )

            assert total == 1
            assert len(members) == 1
            assert members[0]["user_id"] == async_test_user.id
            assert members[0]["email"] == async_test_user.email
            assert members[0]["role"] == OrganizationRole.ADMIN

    @pytest.mark.asyncio
    async def test_get_organization_members_with_pagination(self, async_test_db, async_test_user):
        """Test getting organization members with pagination."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            members, total = await organization_crud.get_organization_members(
                session,
                organization_id=org_id,
                skip=0,
                limit=10
            )

            assert total == 1
            assert len(members) <= 10


class TestGetUserOrganizations:
    """Tests for get_user_organizations method."""

    @pytest.mark.asyncio
    async def test_get_user_organizations_success(self, async_test_db, async_test_user):
        """Test getting user's organizations."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs = await organization_crud.get_user_organizations(
                session,
                user_id=async_test_user.id
            )

            assert len(orgs) == 1
            assert orgs[0].name == "Test Org"

    @pytest.mark.asyncio
    async def test_get_user_organizations_filter_inactive(self, async_test_db, async_test_user):
        """Test filtering inactive organizations."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org1 = Organization(name="Active Org", slug="active-org")
            org2 = Organization(name="Inactive Org", slug="inactive-org")
            session.add_all([org1, org2])
            await session.commit()

            user_org1 = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org1.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            user_org2 = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org2.id,
                role=OrganizationRole.MEMBER,
                is_active=False
            )
            session.add_all([user_org1, user_org2])
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs = await organization_crud.get_user_organizations(
                session,
                user_id=async_test_user.id,
                is_active=True
            )

            assert len(orgs) == 1
            assert orgs[0].name == "Active Org"


class TestGetUserRole:
    """Tests for get_user_role_in_org method."""

    @pytest.mark.asyncio
    async def test_get_user_role_in_org_success(self, async_test_db, async_test_user):
        """Test getting user role in organization_crud."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.ADMIN,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            role = await organization_crud.get_user_role_in_org(
                session,
                user_id=async_test_user.id,
                organization_id=org_id
            )

            assert role == OrganizationRole.ADMIN

    @pytest.mark.asyncio
    async def test_get_user_role_in_org_not_found(self, async_test_db):
        """Test getting role for non-member returns None."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            role = await organization_crud.get_user_role_in_org(
                session,
                user_id=uuid4(),
                organization_id=org_id
            )

            assert role is None


class TestIsUserOrgOwner:
    """Tests for is_user_org_owner method."""

    @pytest.mark.asyncio
    async def test_is_user_org_owner_true(self, async_test_db, async_test_user):
        """Test checking if user is owner."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.OWNER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            is_owner = await organization_crud.is_user_org_owner(
                session,
                user_id=async_test_user.id,
                organization_id=org_id
            )

            assert is_owner is True

    @pytest.mark.asyncio
    async def test_is_user_org_owner_false(self, async_test_db, async_test_user):
        """Test checking if non-owner user is owner."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            is_owner = await organization_crud.is_user_org_owner(
                session,
                user_id=async_test_user.id,
                organization_id=org_id
            )

            assert is_owner is False


class TestGetMultiWithMemberCounts:
    """Tests for get_multi_with_member_counts method."""

    @pytest.mark.asyncio
    async def test_get_multi_with_member_counts_success(self, async_test_db, async_test_user):
        """Test getting organizations with member counts."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org1 = Organization(name="Org 1", slug="org-1")
            org2 = Organization(name="Org 2", slug="org-2")
            session.add_all([org1, org2])
            await session.commit()

            # Add members to org1
            user_org1 = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org1.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org1)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs_with_counts, total = await organization_crud.get_multi_with_member_counts(session)

            assert total == 2
            assert len(orgs_with_counts) == 2
            # Verify structure
            assert 'organization' in orgs_with_counts[0]
            assert 'member_count' in orgs_with_counts[0]

    @pytest.mark.asyncio
    async def test_get_multi_with_member_counts_with_filters(self, async_test_db):
        """Test getting organizations with member counts and filters."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org1 = Organization(name="Active Org", slug="active-org", is_active=True)
            org2 = Organization(name="Inactive Org", slug="inactive-org", is_active=False)
            session.add_all([org1, org2])
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs_with_counts, total = await organization_crud.get_multi_with_member_counts(
                session,
                is_active=True
            )

            assert total == 1
            assert orgs_with_counts[0]['organization'].name == "Active Org"

    @pytest.mark.asyncio
    async def test_get_multi_with_member_counts_with_search(self, async_test_db):
        """Test searching organizations with member counts."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org1 = Organization(name="Tech Corp", slug="tech-corp")
            org2 = Organization(name="Food Inc", slug="food-inc")
            session.add_all([org1, org2])
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs_with_counts, total = await organization_crud.get_multi_with_member_counts(
                session,
                search="tech"
            )

            assert total == 1
            assert orgs_with_counts[0]['organization'].name == "Tech Corp"


class TestGetUserOrganizationsWithDetails:
    """Tests for get_user_organizations_with_details method."""

    @pytest.mark.asyncio
    async def test_get_user_organizations_with_details_success(self, async_test_db, async_test_user):
        """Test getting user organizations with role and member count."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.ADMIN,
                is_active=True
            )
            session.add(user_org)
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs_with_details = await organization_crud.get_user_organizations_with_details(
                session,
                user_id=async_test_user.id
            )

            assert len(orgs_with_details) == 1
            assert orgs_with_details[0]['organization'].name == "Test Org"
            assert orgs_with_details[0]['role'] == OrganizationRole.ADMIN
            assert 'member_count' in orgs_with_details[0]

    @pytest.mark.asyncio
    async def test_get_user_organizations_with_details_filter_inactive(self, async_test_db, async_test_user):
        """Test filtering inactive organizations in user details."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org1 = Organization(name="Active Org", slug="active-org")
            org2 = Organization(name="Inactive Org", slug="inactive-org")
            session.add_all([org1, org2])
            await session.commit()

            user_org1 = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org1.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            user_org2 = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org2.id,
                role=OrganizationRole.MEMBER,
                is_active=False
            )
            session.add_all([user_org1, user_org2])
            await session.commit()

        async with AsyncTestingSessionLocal() as session:
            orgs_with_details = await organization_crud.get_user_organizations_with_details(
                session,
                user_id=async_test_user.id,
                is_active=True
            )

            assert len(orgs_with_details) == 1
            assert orgs_with_details[0]['organization'].name == "Active Org"


class TestIsUserOrgAdmin:
    """Tests for is_user_org_admin method."""

    @pytest.mark.asyncio
    async def test_is_user_org_admin_owner(self, async_test_db, async_test_user):
        """Test checking if owner is admin (should be True)."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.OWNER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            is_admin = await organization_crud.is_user_org_admin(
                session,
                user_id=async_test_user.id,
                organization_id=org_id
            )

            assert is_admin is True

    @pytest.mark.asyncio
    async def test_is_user_org_admin_admin_role(self, async_test_db, async_test_user):
        """Test checking if admin role is admin."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.ADMIN,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            is_admin = await organization_crud.is_user_org_admin(
                session,
                user_id=async_test_user.id,
                organization_id=org_id
            )

            assert is_admin is True

    @pytest.mark.asyncio
    async def test_is_user_org_admin_member_false(self, async_test_db, async_test_user):
        """Test checking if regular member is admin."""
        test_engine, AsyncTestingSessionLocal = async_test_db

        async with AsyncTestingSessionLocal() as session:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.commit()

            user_org = UserOrganization(
                user_id=async_test_user.id,
                organization_id=org.id,
                role=OrganizationRole.MEMBER,
                is_active=True
            )
            session.add(user_org)
            await session.commit()
            org_id = org.id

        async with AsyncTestingSessionLocal() as session:
            is_admin = await organization_crud.is_user_org_admin(
                session,
                user_id=async_test_user.id,
                organization_id=org_id
            )

            assert is_admin is False
