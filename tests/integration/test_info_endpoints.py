"""Integration tests for info and health endpoints."""
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test GET / returns API info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "endpoints" in data


def test_health_endpoint(client: TestClient):
    """Test GET /health returns healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_available_sectors(client: TestClient):
    """Test GET /api/v1/sectors returns sectors list."""
    response = client.get("/api/v1/sectors")
    assert response.status_code == 200
    data = response.json()
    assert "sectors" in data
    assert data["count"] > 0
    assert any(s["name"] == "Technology" for s in data["sectors"])
