import uuid

import pytest
from httpx import AsyncClient

from app.main import app
from app.core.config import settings

settings.ENABLE_MONITOR = False


async def register_and_login(client: AsyncClient) -> dict:
    email = f"tester_{uuid.uuid4().hex}@example.com"
    password = "Str0ngPassword!"

    register_response = await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Tester"},
    )
    assert register_response.status_code == 201
    data = register_response.json()
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test root endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "dYdX Alert"
        assert "version" in data


@pytest.mark.asyncio
async def test_health_check():
    """Test health check endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "monitored_subaccounts" in data


@pytest.mark.asyncio
async def test_create_subaccount():
    """Test creating a subaccount"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        headers = await register_and_login(client)

        response = await client.post(
            "/api/subaccounts",
            json={
                "address": "dydx14z5yr5j35tjk5lnzshzascy42pqfxn5w7d2w97",
                "subaccount_number": 0,
                "nickname": "Test Account",
                "liquidation_threshold_percent": 10.0,
            },
            headers=headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["address"] == "dydx14z5yr5j35tjk5lnzshzascy42pqfxn5w7d2w97"
        assert data["nickname"] == "Test Account"


@pytest.mark.asyncio
async def test_list_subaccounts():
    """Test listing subaccounts"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        headers = await register_and_login(client)

        await client.post(
            "/api/subaccounts",
            json={
                "address": "dydx1exampleaccount000000000000000000000",
                "subaccount_number": 1,
                "nickname": "Demo",
                "liquidation_threshold_percent": 12.5,
            },
            headers=headers,
        )

        response = await client.get("/api/subaccounts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1


@pytest.mark.asyncio
async def test_list_alerts():
    """Test listing alerts"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        headers = await register_and_login(client)
        response = await client.get("/api/alerts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
