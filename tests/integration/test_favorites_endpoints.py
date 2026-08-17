"""Integration tests for favorites and contact endpoints."""
from fastapi.testclient import TestClient


def test_favorites_crud_endpoints(auth_client):
    """Test GET/POST/DELETE /api/v1/favorites."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    # Add favorite
    add_res = client.post("/api/v1/favorites", json={"sector": "Renewable Energy"}, headers=headers)
    assert add_res.status_code == 200

    # List favorites
    list_res = client.get("/api/v1/favorites", headers=headers)
    assert list_res.status_code == 200
    fav_data = list_res.json()
    assert "Renewable Energy" in fav_data["favorites"]

    # Delete favorite
    del_res = client.delete("/api/v1/favorites/Renewable Energy", headers=headers)
    assert del_res.status_code == 200

    # Verify deleted
    list_res2 = client.get("/api/v1/favorites", headers=headers)
    assert "Renewable Energy" not in list_res2.json()["favorites"]


def test_contact_submission(client: TestClient):
    """Test POST /api/v1/contact."""
    payload = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "message": "We need custom API rate limits.",
        "company": "TradeX Corp",
        "plan_interest": "enterprise",
    }
    res = client.post("/api/v1/contact", json=payload)
    assert res.status_code == 200
    assert "id" in res.json()
