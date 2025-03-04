# tests/core/test_auth.py
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from jose import jwt
from pydantic import ValidationError

from app.core.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_data,
    TokenExpiredError,
    TokenInvalidError,
    TokenMissingClaimError
)
from app.core.config import settings


class TestPasswordHandling:
    """Tests for password hashing and verification functions"""

    def test_password_hash_different_from_password(self):
        """Test that a password hash is different from the original password"""
        password = "TestPassword123"
        hashed = get_password_hash(password)
        assert hashed != password

    def test_verify_correct_password(self):
        """Test that verify_password returns True for the correct password"""
        password = "TestPassword123"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_verify_incorrect_password(self):
        """Test that verify_password returns False for an incorrect password"""
        password = "TestPassword123"
        wrong_password = "WrongPassword123"
        hashed = get_password_hash(password)
        assert verify_password(wrong_password, hashed) is False

    def test_same_password_different_hash(self):
        """Test that the same password gets a different hash each time"""
        password = "TestPassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        assert hash1 != hash2


class TestTokenCreation:
    """Tests for token creation functions"""

    def test_create_access_token(self):
        """Test that an access token is created with the correct claims"""
        user_id = str(uuid.uuid4())
        custom_claims = {
            "email": "test@example.com",
            "first_name": "Test",
            "is_superuser": True
        }
        token = create_access_token(subject=user_id, claims=custom_claims)

        # Decode token to verify claims
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        # Check standard claims
        assert payload["sub"] == user_id
        assert "jti" in payload
        assert "exp" in payload
        assert "iat" in payload
        assert payload["type"] == "access"

        # Check custom claims
        for key, value in custom_claims.items():
            assert payload[key] == value

    def test_create_refresh_token(self):
        """Test that a refresh token is created with the correct claims"""
        user_id = str(uuid.uuid4())
        token = create_refresh_token(subject=user_id)

        # Decode token to verify claims
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        # Check standard claims
        assert payload["sub"] == user_id
        assert "jti" in payload
        assert "exp" in payload
        assert "iat" in payload
        assert payload["type"] == "refresh"

    def test_token_expiration(self):
        """Test that tokens have the correct expiration time"""
        user_id = str(uuid.uuid4())
        expires = timedelta(minutes=5)

        # Create token with specific expiration
        token = create_access_token(
            subject=user_id,
            expires_delta=expires
        )

        # Decode token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        # Get actual expiration time from token
        expiration = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

        # Calculate expected expiration (approximately)
        now = datetime.now(timezone.utc)
        expected_expiration = now + expires

        # Difference should be small (less than 1 second)
        difference = abs((expiration - expected_expiration).total_seconds())
        assert difference < 1


class TestTokenDecoding:
    """Tests for token decoding and validation functions"""

    def test_decode_valid_token(self):
        """Test that a valid token can be decoded"""
        user_id = str(uuid.uuid4())
        token = create_access_token(subject=user_id)

        # Decode token
        payload = decode_token(token)

        # Check that the subject matches
        assert payload.sub == user_id

    def test_decode_expired_token(self):
        """Test that an expired token raises TokenExpiredError"""
        user_id = str(uuid.uuid4())

        # Create a token that's already expired by directly manipulating the payload
        now = datetime.now(timezone.utc)
        expired_time = now - timedelta(hours=1)  # 1 hour in the past

        # Create the expired token manually
        payload = {
            "sub": user_id,
            "exp": int(expired_time.timestamp()),  # Set expiration in the past
            "iat": int(now.timestamp()),
            "jti": str(uuid.uuid4()),
            "type": "access"
        }

        expired_token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )

        # Attempting to decode should raise TokenExpiredError
        with pytest.raises(TokenExpiredError):
            decode_token(expired_token)

    def test_decode_invalid_token(self):
        """Test that an invalid token raises TokenInvalidError"""
        invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpbnZhbGlkIn0.invalid-signature"

        with pytest.raises(TokenInvalidError):
            decode_token(invalid_token)

    def test_decode_token_with_missing_sub(self):
        """Test that a token without 'sub' claim raises TokenMissingClaimError"""
        # Create a token without a subject
        now = datetime.now(timezone.utc)
        payload = {
            "exp": int((now + timedelta(minutes=30)).timestamp()),
            "iat": int(now.timestamp()),
            "jti": str(uuid.uuid4()),
            "type": "access"
            # No 'sub' claim
        }

        token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )

        with pytest.raises(TokenMissingClaimError):
            decode_token(token)

    def test_decode_token_with_wrong_type(self):
        """Test that verifying a token with wrong type raises TokenInvalidError"""
        user_id = str(uuid.uuid4())
        token = create_access_token(subject=user_id)

        # Try to verify it as a refresh token
        with pytest.raises(TokenInvalidError):
            decode_token(token, verify_type="refresh")

    def test_decode_with_invalid_payload(self):
        """Test that a token with invalid payload structure raises TokenInvalidError"""
        # Create a token with an invalid payload structure - missing 'sub' which is required
        # but including 'exp' to avoid the expiration check
        now = datetime.now(timezone.utc)
        payload = {
            # Missing "sub" field which is required
            "exp": int((now + timedelta(minutes=30)).timestamp()),
            "iat": int(now.timestamp()),
            "jti": str(uuid.uuid4()),
            "invalid_field": "test"
        }

        token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )

        # Should raise TokenMissingClaimError due to missing 'sub'
        with pytest.raises(TokenMissingClaimError):
            decode_token(token)

        # Create another token with invalid type for required field
        payload = {
            "sub": 123,  # sub should be a string, not an integer
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }

        token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )

        # Should raise TokenInvalidError due to ValidationError
        with pytest.raises(TokenInvalidError):
            decode_token(token)

    def test_get_token_data(self):
        """Test extracting TokenData from a token"""
        user_id = uuid.uuid4()
        token = create_access_token(
            subject=str(user_id),
            claims={"is_superuser": True}
        )

        token_data = get_token_data(token)

        assert token_data.user_id == user_id
        assert token_data.is_superuser is True