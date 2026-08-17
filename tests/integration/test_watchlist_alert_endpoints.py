"""Integration tests for watchlist and alert endpoints."""
from fastapi.testclient import TestClient


def test_watchlist_flow(auth_client):
    """Test creating, listing, and deleting a watchlist item."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    # Create watchlist
    create_res = client.post("/api/v1/watchlists", json={
        "sector": "Fintech",
        "cadence": "daily",
        "channels": ["in_app"],
    }, headers=headers)
    assert create_res.status_code == 200
    wl_item = create_res.json()
    assert wl_item["sector"] == "Fintech"
    wl_id = wl_item["id"]

    # List watchlists
    list_res = client.get("/api/v1/watchlists", headers=headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["count"] >= 1
    assert any(w["id"] == wl_id for w in data["items"])

    # Delete watchlist
    del_res = client.delete(f"/api/v1/watchlists/{wl_id}", headers=headers)
    assert del_res.status_code == 200


def test_alerts_listing(auth_client):
    """Test GET /api/v1/alerts."""
    client, token = auth_client
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/alerts", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "unread" in data
