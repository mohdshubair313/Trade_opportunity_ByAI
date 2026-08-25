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


def test_ratelimit_response_headers(client: TestClient):
    """Test that API responses include standard RFC RateLimit headers."""
    response = client.get("/health")
    assert response.status_code == 200
    assert "RateLimit-Limit" in response.headers
    assert "RateLimit-Remaining" in response.headers
    assert "RateLimit-Reset" in response.headers
    assert "RateLimit-Policy" in response.headers


def test_deprecation_headers(client: TestClient):
    """Test that deprecated endpoints return RFC 8594 Deprecation and Sunset headers."""
    response = client.post("/api/v1/auth/login-legacy", json={"username": "invalid", "password": "bad"})
    assert "Deprecation" in response.headers
    assert "Sunset" in response.headers
    assert "Link" in response.headers


def test_openapi_schema_complete_coverage(client: TestClient):
    """Test that 100% of OpenAPI operations have summaries, descriptions, and operationIds."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    paths = spec.get("paths", {})
    total_ops = 0
    ops_with_desc = 0
    ops_with_id = 0

    for path, methods in paths.items():
        for method, op in methods.items():
            if method.lower() in ("get", "post", "put", "delete", "patch", "options"):
                total_ops += 1
                if op.get("summary") or op.get("description"):
                    ops_with_desc += 1
                if op.get("operationId"):
                    ops_with_id += 1

    assert total_ops > 0
    assert ops_with_desc == total_ops, f"Only {ops_with_desc}/{total_ops} operations have descriptions"
    assert ops_with_id == total_ops, f"Only {ops_with_id}/{total_ops} operations have operationIds"


