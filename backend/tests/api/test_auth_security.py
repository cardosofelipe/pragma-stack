"""
Security tests for authentication routes (app/api/routes/auth.py).

Critical security tests covering:
- Revoked session protection (prevents stolen refresh tokens)
- Session hijacking prevention (cross-user session attacks)
- Token replay prevention

These tests prevent real-world attack scenarios.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_refresh_token
from app.crud.session import session as session_crud
from app.models.user import User


class TestRevokedSessionSecurity:
    """
    Test revoked session protection (auth.py lines 261-262).

    Attack Scenario:
    Attacker steals a user's refresh token. User logs out, but attacker
    tries to use the stolen token. System must reject it.

    Covers: auth.py:261-262
    """

    @pytest.mark.asyncio
    async def test_refresh_token_rejected_after_logout(
        self,
        client: AsyncClient,
        async_test_db,
        async_test_user: User
    ):
        """
        Test that refresh tokens are rejected after session is deactivated.

        Attack Scenario:
        1. User logs in normally
        2. Attacker steals refresh token
        3. User logs out (deactivates session)
        4. Attacker tries to use stolen refresh token
        5. System MUST reject it (session revoked)
        """
        test_engine, SessionLocal = async_test_db

        # Step 1: Create a session and refresh token for the user
        async with SessionLocal() as session:
            # Login to get tokens
            response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": async_test_user.email,
                    "password": "TestPassword123!",
                },
            )
            assert response.status_code == 200
            tokens = response.json()
            refresh_token = tokens["refresh_token"]
            access_token = tokens["access_token"]

        # Step 2: Verify refresh token works before logout
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200, "Refresh should work before logout"

        # Step 3: User logs out (deactivates session)
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200, "Logout should succeed"

        # Step 4: Attacker tries to use stolen refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )

        # Step 5: System MUST reject (covers lines 261-262)
        assert response.status_code == 401, "Should reject revoked session token"
        data = response.json()
        if "errors" in data:
            assert "revoked" in data["errors"][0]["message"].lower()
        else:
            assert "revoked" in data.get("detail", "").lower()

    @pytest.mark.asyncio
    async def test_refresh_token_rejected_for_deleted_session(
        self,
        client: AsyncClient,
        async_test_db,
        async_test_user: User
    ):
        """
        Test that tokens for deleted sessions are rejected.

        Attack Scenario:
        Admin deletes a session from database, but attacker has the token.
        """
        test_engine, SessionLocal = async_test_db

        # Step 1: Login to create a session
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": async_test_user.email,
                "password": "TestPassword123!",
            },
        )
        assert response.status_code == 200
        tokens = response.json()
        refresh_token = tokens["refresh_token"]

        # Step 2: Manually delete the session from database (simulating admin action)
        from app.core.auth import decode_token
        token_data = decode_token(refresh_token, verify_type="refresh")
        jti = token_data.jti

        async with SessionLocal() as session:
            # Find and delete the session
            db_session = await session_crud.get_by_jti(session, jti=jti)
            if db_session:
                await session.delete(db_session)
                await session.commit()

        # Step 3: Try to use the refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )

        # Should reject (session doesn't exist)
        assert response.status_code == 401
        data = response.json()
        if "errors" in data:
            assert "revoked" in data["errors"][0]["message"].lower() or "session" in data["errors"][0]["message"].lower()
        else:
            assert "revoked" in data.get("detail", "").lower()


class TestSessionHijackingSecurity:
    """
    Test session hijacking prevention (auth.py lines 509-513).

    Attack Scenario:
    User A tries to logout User B's session by providing User B's refresh token.
    System must prevent this cross-user session manipulation.

    Covers: auth.py:509-513
    """

    @pytest.mark.asyncio
    async def test_cannot_logout_another_users_session(
        self,
        client: AsyncClient,
        async_test_db,
        async_test_user: User,
        async_test_superuser: User
    ):
        """
        Test that users cannot logout other users' sessions.

        Attack Scenario:
        1. User A and User B both log in
        2. User A steals User B's refresh token
        3. User A tries to logout User B's session
        4. System MUST reject (cross-user attack)
        """
        test_engine, SessionLocal = async_test_db

        # Step 1: User A logs in
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": async_test_user.email,
                "password": "TestPassword123!",
            },
        )
        assert response.status_code == 200
        user_a_tokens = response.json()
        user_a_access = user_a_tokens["access_token"]

        # Step 2: User B logs in
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": async_test_superuser.email,
                "password": "SuperPassword123!",
            },
        )
        assert response.status_code == 200
        user_b_tokens = response.json()
        user_b_refresh = user_b_tokens["refresh_token"]

        # Step 3: User A tries to logout User B's session using User B's refresh token
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {user_a_access}"},  # User A's access token
            json={"refresh_token": user_b_refresh}  # But User B's refresh token
        )

        # Step 4: System MUST reject (covers lines 509-513)
        assert response.status_code == 403, "Should reject cross-user session logout"
        # Global exception handler wraps errors in 'errors' array
        data = response.json()
        if "errors" in data:
            assert "own sessions" in data["errors"][0]["message"].lower()
        else:
            assert "own sessions" in data.get("detail", "").lower()

    @pytest.mark.asyncio
    async def test_users_can_logout_their_own_sessions(
        self,
        client: AsyncClient,
        async_test_user: User
    ):
        """
        Sanity check: Users CAN logout their own sessions.

        Ensures our security check doesn't break legitimate use.
        """
        # Login
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": async_test_user.email,
                "password": "TestPassword123!",
            },
        )
        assert response.status_code == 200
        tokens = response.json()

        # Logout own session - should work
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"refresh_token": tokens["refresh_token"]}
        )
        assert response.status_code == 200, "Users should be able to logout their own sessions"
