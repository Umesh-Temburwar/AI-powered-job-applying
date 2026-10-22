from fastapi.testclient import TestClient


def test_docs_available_in_development(client: TestClient):
    """Verify /docs and /openapi.json are enabled in development."""
    response = client.get("/docs")
    assert response.status_code == 200

    openapi_resp = client.get("/openapi.json")
    assert openapi_resp.status_code == 200


def test_docs_absent_in_production(prod_client: TestClient):
    """Verify /docs and /openapi.json are disabled (404) in production."""
    response = prod_client.get("/docs")
    assert response.status_code == 404

    openapi_resp = prod_client.get("/openapi.json")
    assert openapi_resp.status_code == 404
