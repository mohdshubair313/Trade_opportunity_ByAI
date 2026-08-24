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


def test_openapi_spec_published(client: TestClient):
    """Test GET /openapi.json is accessible and contains valid OpenAPI 3.x schema."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert "openapi" in spec
    assert "paths" in spec
    assert "/health" in spec["paths"]
    assert "/api/v1/sectors" in spec["paths"]
    # Check that operation IDs are present for agent function-calling
    assert spec["paths"]["/health"]["get"]["operationId"] == "healthCheck"
    assert spec["paths"]["/api/v1/sectors"]["get"]["operationId"] == "listAvailableSectors"

