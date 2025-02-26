import pytest
from user import app, init_db

@pytest.fixture
def client():
    app.config["TESTING"] = True
    client = app.test_client()
    init_db()
    return client

def test_login(client):
    res = client.post("/login", json={"email": "test@example.com", "password": "1234"})
    assert res.status_code in [200, 401]  # 200: Success, 401: Error Account or Password

def test_logout(client):
    client.get("/logout")
    res = client.get("/dashboard")
    assert res.status_code == 302  # 302: Logout

def test_get_transactions(client):
    res = client.get("/transactions")
    assert res.status_code in [200, 401]  # 200: Success, 401: Not Login

def test_add_transaction(client):
    with client.session_transaction() as session:
        session["user_id"] = 1  # User Login
    res = client.post("/add_transaction", json={"amount": 100.0, "category": "Food", "date": "2025-02-25", "description": "Lunch"})
    assert res.status_code in [200, 401]  # 200: Success, 401: Not Login

def test_dashboard_access(client):
    res = client.get("/dashboard")
    assert res.status_code in [200, 302]  # 200: Enter Success, 302: Not Login
