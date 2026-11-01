from fastapi.testclient import TestClient


def test_cors_preflight_allowed_origin(client: TestClient):
    """Verify preflight request from allowed origin returns Access-Control-Allow-Origin."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type",
    }
    response = client.options("/api/v1/dashboard/summary", headers=headers)
    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    )

    # Test LAN IP origin (e.g. mobile access)
    lan_headers = {
        "Origin": "http://192.168.1.101:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type",
    }
    lan_res = client.options("/api/v1/dashboard/summary", headers=lan_headers)
    assert lan_res.status_code == 200
    assert lan_res.headers.get("access-control-allow-origin") == "http://192.168.1.101:5173"


def test_cors_preflight_disallowed_origin(client: TestClient):
    """Verify preflight request from unknown origin is not granted Access-Control-Allow-Origin."""
    headers = {
        "Origin": "https://malicious-external-site.com",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type",
    }
    response = client.options("/api/v1/dashboard/summary", headers=headers)
    # When origin is disallowed, CORS middleware must not return access-control-allow-origin for it
    assert (
        response.headers.get("access-control-allow-origin")
        != "https://malicious-external-site.com"
    )


def test_x_request_id_in_response(client: TestClient):
    """Verify X-Request-ID header is always generated and returned."""
    response = client.get("/health")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) > 0


def test_x_request_id_preserved_if_supplied(client: TestClient):
    """Verify incoming X-Request-ID is preserved and echoed back."""
    custom_id = "test-client-req-9999"
    response = client.get("/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID") == custom_id
