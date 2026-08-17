"""Integration tests for user profile and stats endpoints."""
from fastapi.testclient import TestClient


def test_user_profile_and_stats(auth_client):
    """Test GET /api/v1/users/me and GET /api/v1/users/me/stats."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    # Profile
    res = client.get("/api/v1/users/me", headers=headers)
    assert res.status_code == 200
    profile = res.json()
    assert profile["username"] == "demo_user"
    assert profile["email"] == "demo@example.com"

    # Stats
    stats_res = client.get("/api/v1/users/me/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_analyses" in stats
    assert "favorite_sectors" in stats


def test_update_profile(auth_client):
    """Test PUT /api/v1/users/me."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "full_name": "Updated Demo User",
        "persona": "investor",
        "risk_appetite": "medium",
    }
    res = client.put("/api/v1/users/me", json=update_payload, headers=headers)
    assert res.status_code == 200
    updated = res.json()
    assert updated["full_name"] == "Updated Demo User"
    assert updated["persona"] == "investor"
