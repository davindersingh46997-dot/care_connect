from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_chat_endpoint_exists_and_returns_response():
    response = client.post("/api/chat", json={"message": "show doctors"})
    assert response.status_code == 200, response.text
    data = response.json()
    assert "response" in data
    assert isinstance(data["response"], str)


def test_chat_stream_endpoint_exists_and_uses_streaming_response():
    response = client.post("/api/chat/stream", json={"message": "show doctors"})
    assert response.status_code == 200, response.text
    assert "text/event-stream" in response.headers.get("content-type", "")
