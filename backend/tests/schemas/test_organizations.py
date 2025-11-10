"""
Tests for organization schemas (app/schemas/organizations.py).

Covers Pydantic validators for:
- Slug validation (lines 26, 28, 30, 32, 62-70)
- Name validation (lines 40, 77)
"""

import pytest
from pydantic import ValidationError

from app.schemas.organizations import (
    OrganizationBase,
    OrganizationCreate,
    OrganizationUpdate,
)


class TestOrganizationBaseValidators:
    """Test validators in OrganizationBase schema."""

    def test_valid_organization_base(self):
        """Test that valid data passes validation."""
        org = OrganizationBase(name="Test Organization", slug="test-org")
        assert org.name == "Test Organization"
        assert org.slug == "test-org"

    def test_slug_none_returns_none(self):
        """Test that None slug is allowed (covers line 26)."""
        org = OrganizationBase(name="Test Organization", slug=None)
        assert org.slug is None

    def test_slug_invalid_characters_rejected(self):
        """Test slug with invalid characters is rejected (covers line 28)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationBase(
                name="Test Organization",
                slug="Test_Org!",  # Uppercase and special chars
            )
        errors = exc_info.value.errors()
        assert any(
            "lowercase letters, numbers, and hyphens" in str(e["msg"]) for e in errors
        )

    def test_slug_starts_with_hyphen_rejected(self):
        """Test slug starting with hyphen is rejected (covers line 30)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationBase(name="Test Organization", slug="-test-org")
        errors = exc_info.value.errors()
        assert any("cannot start or end with a hyphen" in str(e["msg"]) for e in errors)

    def test_slug_ends_with_hyphen_rejected(self):
        """Test slug ending with hyphen is rejected (covers line 30)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationBase(name="Test Organization", slug="test-org-")
        errors = exc_info.value.errors()
        assert any("cannot start or end with a hyphen" in str(e["msg"]) for e in errors)

    def test_slug_consecutive_hyphens_rejected(self):
        """Test slug with consecutive hyphens is rejected (covers line 32)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationBase(name="Test Organization", slug="test--org")
        errors = exc_info.value.errors()
        assert any(
            "cannot contain consecutive hyphens" in str(e["msg"]) for e in errors
        )

    def test_name_whitespace_only_rejected(self):
        """Test whitespace-only name is rejected (covers line 40)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationBase(name="   ", slug="test-org")
        errors = exc_info.value.errors()
        assert any("name cannot be empty" in str(e["msg"]) for e in errors)

    def test_name_trimmed(self):
        """Test that name is trimmed."""
        org = OrganizationBase(name="  Test Organization  ", slug="test-org")
        assert org.name == "Test Organization"


class TestOrganizationCreateValidators:
    """Test OrganizationCreate schema inherits validators."""

    def test_valid_organization_create(self):
        """Test that valid data passes validation."""
        org = OrganizationCreate(name="Test Organization", slug="test-org")
        assert org.name == "Test Organization"
        assert org.slug == "test-org"

    def test_slug_validation_inherited(self):
        """Test that slug validation is inherited from base."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationCreate(name="Test", slug="Invalid_Slug!")
        errors = exc_info.value.errors()
        assert any(
            "lowercase letters, numbers, and hyphens" in str(e["msg"]) for e in errors
        )


class TestOrganizationUpdateValidators:
    """Test validators in OrganizationUpdate schema."""

    def test_valid_organization_update(self):
        """Test that valid update data passes validation."""
        org = OrganizationUpdate(name="Updated Name", slug="updated-slug")
        assert org.name == "Updated Name"
        assert org.slug == "updated-slug"

    def test_slug_none_returns_none(self):
        """Test that None slug is allowed in update (covers line 62)."""
        org = OrganizationUpdate(slug=None)
        assert org.slug is None

    def test_update_slug_invalid_characters_rejected(self):
        """Test update slug with invalid characters is rejected (covers line 64)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationUpdate(slug="Test_Org!")
        errors = exc_info.value.errors()
        assert any(
            "lowercase letters, numbers, and hyphens" in str(e["msg"]) for e in errors
        )

    def test_update_slug_starts_with_hyphen_rejected(self):
        """Test update slug starting with hyphen is rejected (covers line 66)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationUpdate(slug="-test-org")
        errors = exc_info.value.errors()
        assert any("cannot start or end with a hyphen" in str(e["msg"]) for e in errors)

    def test_update_slug_ends_with_hyphen_rejected(self):
        """Test update slug ending with hyphen is rejected (covers line 66)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationUpdate(slug="test-org-")
        errors = exc_info.value.errors()
        assert any("cannot start or end with a hyphen" in str(e["msg"]) for e in errors)

    def test_update_slug_consecutive_hyphens_rejected(self):
        """Test update slug with consecutive hyphens is rejected (covers line 68)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationUpdate(slug="test--org")
        errors = exc_info.value.errors()
        assert any(
            "cannot contain consecutive hyphens" in str(e["msg"]) for e in errors
        )

    def test_update_name_whitespace_only_rejected(self):
        """Test whitespace-only name in update is rejected (covers line 77)."""
        with pytest.raises(ValidationError) as exc_info:
            OrganizationUpdate(name="   ")
        errors = exc_info.value.errors()
        assert any("name cannot be empty" in str(e["msg"]) for e in errors)

    def test_update_name_none_allowed(self):
        """Test that None name is allowed in update."""
        org = OrganizationUpdate(name=None)
        assert org.name is None

    def test_update_name_trimmed(self):
        """Test that update name is trimmed."""
        org = OrganizationUpdate(name="  Updated Name  ")
        assert org.name == "Updated Name"

    def test_partial_update(self):
        """Test that partial updates work (all fields optional)."""
        org = OrganizationUpdate(name="New Name")
        assert org.name == "New Name"
        assert org.slug is None
        assert org.description is None
