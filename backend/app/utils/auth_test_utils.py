"""
Authentication utilities for testing.
This module provides tools to bypass FastAPI's authentication in tests.
"""
from typing import Callable, Dict, Optional

from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer
from starlette.testclient import TestClient

from app.api.dependencies.auth import get_current_user, get_optional_current_user
from app.models.user import User


def create_test_auth_client(
        app: FastAPI,
        test_user: User,
        extra_overrides: Optional[Dict[Callable, Callable]] = None
) -> TestClient:
    """
    Create a test client with authentication pre-configured.

    This bypasses the OAuth2 token validation and directly returns the test user.

    Args:
        app: The FastAPI app to test
        test_user: The user object to use for authentication
        extra_overrides: Additional dependency overrides to apply

    Returns:
        TestClient with authentication configured
    """
    # First override the oauth2_scheme dependency to return a dummy token
    # This prevents FastAPI from trying to extract a real bearer token from the request
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
    app.dependency_overrides[oauth2_scheme] = lambda: "dummy_token_for_testing"

    # Then override the get_current_user dependency to return our test user
    app.dependency_overrides[get_current_user] = lambda: test_user

    # Apply any extra overrides
    if extra_overrides:
        for dep, override in extra_overrides.items():
            app.dependency_overrides[dep] = override

    # Create and return the client
    return TestClient(app)


def create_test_optional_auth_client(
        app: FastAPI,
        test_user: User
) -> TestClient:
    """
    Create a test client with optional authentication pre-configured.

    This is useful for testing endpoints that use get_optional_current_user.

    Args:
        app: The FastAPI app to test
        test_user: The user object to use for authentication

    Returns:
        TestClient with optional authentication configured
    """
    # Override the get_optional_current_user dependency
    app.dependency_overrides[get_optional_current_user] = lambda: test_user

    # Create and return the client
    return TestClient(app)


def create_test_superuser_client(
        app: FastAPI,
        test_user: User
) -> TestClient:
    """
    Create a test client with superuser authentication pre-configured.

    Args:
        app: The FastAPI app to test
        test_user: The user object to use as superuser

    Returns:
        TestClient with superuser authentication
    """
    # Make sure user is a superuser
    test_user.is_superuser = True

    # Use the auth client creation with superuser
    return create_test_auth_client(app, test_user)


def create_test_unauthenticated_client(app: FastAPI) -> TestClient:
    """
    Create a test client that will fail authentication checks.

    This is useful for testing the unauthorized case of protected endpoints.

    Args:
        app: The FastAPI app to test

    Returns:
        TestClient without authentication
    """
    # Any authentication attempts will fail
    return TestClient(app)


def cleanup_test_client_auth(app: FastAPI) -> None:
    """
    Clean up authentication overrides from the FastAPI app.

    Call this after your tests to restore normal authentication behavior.

    Args:
        app: The FastAPI app to clean up
    """
    # Get all auth dependencies
    auth_deps = [
        get_current_user,
        get_optional_current_user,
        OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
    ]

    # Remove overrides
    for dep in auth_deps:
        if dep in app.dependency_overrides:
            del app.dependency_overrides[dep]
