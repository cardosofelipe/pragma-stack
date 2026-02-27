# tests/services/test_organization_service.py
"""Tests for the OrganizationService class."""

import uuid

import pytest
import pytest_asyncio

from app.core.exceptions import NotFoundError
from app.models.user_organization import OrganizationRole
from app.schemas.organizations import OrganizationCreate, OrganizationUpdate
from app.services.organization_service import OrganizationService, organization_service


def _make_org_create(name=None, slug=None) -> OrganizationCreate:
    """Helper to create an OrganizationCreate schema with unique defaults."""
    unique = uuid.uuid4().hex[:8]
    return OrganizationCreate(
        name=name or f"Test Org {unique}",
        slug=slug or f"test-org-{unique}",
        description="A test organization",
        is_active=True,
        settings={},
    )


class TestGetOrganization:
    """Tests for OrganizationService.get_organization method."""

    @pytest.mark.asyncio
    async def test_get_organization_found(self, async_test_db, async_test_user):
        """Test getting an existing organization by ID returns the org."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            result = await organization_service.get_organization(
                session, str(created.id)
            )
            assert result is not None
            assert result.id == created.id
            assert result.slug == created.slug

    @pytest.mark.asyncio
    async def test_get_organization_not_found(self, async_test_db):
        """Test getting a non-existent organization raises NotFoundError."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(NotFoundError):
                await organization_service.get_organization(
                    session, str(uuid.uuid4())
                )


class TestCreateOrganization:
    """Tests for OrganizationService.create_organization method."""

    @pytest.mark.asyncio
    async def test_create_organization(self, async_test_db, async_test_user):
        """Test creating a new organization returns the created org with correct fields."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        obj_in = _make_org_create()
        async with AsyncTestingSessionLocal() as session:
            result = await organization_service.create_organization(
                session, obj_in=obj_in
            )
            assert result is not None
            assert result.name == obj_in.name
            assert result.slug == obj_in.slug
            assert result.description == obj_in.description
            assert result.is_active is True


class TestUpdateOrganization:
    """Tests for OrganizationService.update_organization method."""

    @pytest.mark.asyncio
    async def test_update_organization(self, async_test_db, async_test_user):
        """Test updating an organization name."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            org = await organization_service.get_organization(session, str(created.id))
            updated = await organization_service.update_organization(
                session,
                org=org,
                obj_in=OrganizationUpdate(name="Updated Org Name"),
            )
            assert updated.name == "Updated Org Name"
            assert updated.id == created.id

    @pytest.mark.asyncio
    async def test_update_organization_with_dict(self, async_test_db, async_test_user):
        """Test updating an organization using a dict."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            org = await organization_service.get_organization(session, str(created.id))
            updated = await organization_service.update_organization(
                session,
                org=org,
                obj_in={"description": "Updated description"},
            )
            assert updated.description == "Updated description"


class TestRemoveOrganization:
    """Tests for OrganizationService.remove_organization method."""

    @pytest.mark.asyncio
    async def test_remove_organization(self, async_test_db, async_test_user):
        """Test permanently deleting an organization."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )
            org_id = str(created.id)

        async with AsyncTestingSessionLocal() as session:
            await organization_service.remove_organization(session, org_id)

        async with AsyncTestingSessionLocal() as session:
            with pytest.raises(NotFoundError):
                await organization_service.get_organization(session, org_id)


class TestGetMemberCount:
    """Tests for OrganizationService.get_member_count method."""

    @pytest.mark.asyncio
    async def test_get_member_count_empty(self, async_test_db, async_test_user):
        """Test member count for org with no members is zero."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            count = await organization_service.get_member_count(
                session, organization_id=created.id
            )
            assert count == 0

    @pytest.mark.asyncio
    async def test_get_member_count_with_member(self, async_test_db, async_test_user):
        """Test member count increases after adding a member."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            await organization_service.add_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
            )

        async with AsyncTestingSessionLocal() as session:
            count = await organization_service.get_member_count(
                session, organization_id=created.id
            )
            assert count == 1


class TestGetMultiWithMemberCounts:
    """Tests for OrganizationService.get_multi_with_member_counts method."""

    @pytest.mark.asyncio
    async def test_get_multi_with_member_counts(self, async_test_db, async_test_user):
        """Test listing organizations with member counts returns tuple."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            orgs, count = await organization_service.get_multi_with_member_counts(
                session, skip=0, limit=10
            )
            assert isinstance(orgs, list)
            assert isinstance(count, int)
            assert count >= 1

    @pytest.mark.asyncio
    async def test_get_multi_with_member_counts_search(
        self, async_test_db, async_test_user
    ):
        """Test listing organizations with a search filter."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        unique = uuid.uuid4().hex[:8]
        org_name = f"Searchable Org {unique}"
        async with AsyncTestingSessionLocal() as session:
            await organization_service.create_organization(
                session,
                obj_in=OrganizationCreate(
                    name=org_name,
                    slug=f"searchable-org-{unique}",
                    is_active=True,
                    settings={},
                ),
            )

        async with AsyncTestingSessionLocal() as session:
            orgs, count = await organization_service.get_multi_with_member_counts(
                session, skip=0, limit=10, search=f"Searchable Org {unique}"
            )
            assert count >= 1
            # Each element is a dict with key "organization" (an Organization obj) and "member_count"
            names = [o["organization"].name for o in orgs]
            assert org_name in names


class TestGetUserOrganizationsWithDetails:
    """Tests for OrganizationService.get_user_organizations_with_details method."""

    @pytest.mark.asyncio
    async def test_get_user_organizations_with_details(
        self, async_test_db, async_test_user
    ):
        """Test getting organizations for a user returns list of dicts."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )
            await organization_service.add_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
            )

        async with AsyncTestingSessionLocal() as session:
            orgs = await organization_service.get_user_organizations_with_details(
                session, user_id=async_test_user.id
            )
            assert isinstance(orgs, list)
            assert len(orgs) >= 1


class TestGetOrganizationMembers:
    """Tests for OrganizationService.get_organization_members method."""

    @pytest.mark.asyncio
    async def test_get_organization_members(self, async_test_db, async_test_user):
        """Test getting organization members returns paginated results."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )
            await organization_service.add_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
            )

        async with AsyncTestingSessionLocal() as session:
            members, count = await organization_service.get_organization_members(
                session, organization_id=created.id, skip=0, limit=10
            )
            assert isinstance(members, list)
            assert isinstance(count, int)
            assert count >= 1


class TestAddMember:
    """Tests for OrganizationService.add_member method."""

    @pytest.mark.asyncio
    async def test_add_member_default_role(self, async_test_db, async_test_user):
        """Test adding a user to an org with default MEMBER role."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            membership = await organization_service.add_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
            )
            assert membership is not None
            assert membership.user_id == async_test_user.id
            assert membership.organization_id == created.id
            assert membership.role == OrganizationRole.MEMBER

    @pytest.mark.asyncio
    async def test_add_member_admin_role(self, async_test_db, async_test_user):
        """Test adding a user to an org with ADMIN role."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            membership = await organization_service.add_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
                role=OrganizationRole.ADMIN,
            )
            assert membership.role == OrganizationRole.ADMIN


class TestRemoveMember:
    """Tests for OrganizationService.remove_member method."""

    @pytest.mark.asyncio
    async def test_remove_member(self, async_test_db, async_test_user):
        """Test removing a member from an org returns True."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )
            await organization_service.add_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
            )

        async with AsyncTestingSessionLocal() as session:
            removed = await organization_service.remove_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
            )
            assert removed is True

    @pytest.mark.asyncio
    async def test_remove_member_not_found(self, async_test_db, async_test_user):
        """Test removing a non-member returns False."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            removed = await organization_service.remove_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
            )
            assert removed is False


class TestGetUserRoleInOrg:
    """Tests for OrganizationService.get_user_role_in_org method."""

    @pytest.mark.asyncio
    async def test_get_user_role_in_org(self, async_test_db, async_test_user):
        """Test getting a user's role in an org they belong to."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )
            await organization_service.add_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
                role=OrganizationRole.MEMBER,
            )

        async with AsyncTestingSessionLocal() as session:
            role = await organization_service.get_user_role_in_org(
                session,
                user_id=async_test_user.id,
                organization_id=created.id,
            )
            assert role == OrganizationRole.MEMBER

    @pytest.mark.asyncio
    async def test_get_user_role_in_org_not_member(
        self, async_test_db, async_test_user
    ):
        """Test getting role for a user not in the org returns None."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )

        async with AsyncTestingSessionLocal() as session:
            role = await organization_service.get_user_role_in_org(
                session,
                user_id=async_test_user.id,
                organization_id=created.id,
            )
            assert role is None


class TestGetOrgDistribution:
    """Tests for OrganizationService.get_org_distribution method."""

    @pytest.mark.asyncio
    async def test_get_org_distribution_empty(self, async_test_db):
        """Test org distribution with no memberships returns empty list."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            result = await organization_service.get_org_distribution(session, limit=6)
            assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_org_distribution_with_members(
        self, async_test_db, async_test_user
    ):
        """Test org distribution returns org name and member count."""
        _test_engine, AsyncTestingSessionLocal = async_test_db
        async with AsyncTestingSessionLocal() as session:
            created = await organization_service.create_organization(
                session, obj_in=_make_org_create()
            )
            await organization_service.add_member(
                session,
                organization_id=created.id,
                user_id=async_test_user.id,
            )

        async with AsyncTestingSessionLocal() as session:
            result = await organization_service.get_org_distribution(session, limit=6)
            assert isinstance(result, list)
            assert len(result) >= 1
            entry = result[0]
            assert "name" in entry
            assert "value" in entry
            assert entry["value"] >= 1
