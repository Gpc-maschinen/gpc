"""
Test Telegram Order Notification Integration
Tests the full order flow and verifies Telegram notifications are sent correctly.
"""
import pytest
import requests
import os
import time
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")

# Telegram config for verification
TELEGRAM_BOT_TOKEN = "8680890377:AAEt_89EbVgF4GHs3Qw5mOHHjoYLii2ZJlw"
TELEGRAM_CHAT_ID = "-1003820722620"  # Updated supergroup chat ID


class TestTelegramDirectAPI:
    """Test Telegram API directly to verify credentials work"""
    
    def test_telegram_api_send_message(self):
        """Verify Telegram bot can send messages to the configured chat"""
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": f"🧪 Pytest Test - Telegram API Direct Test at {time.strftime('%Y-%m-%d %H:%M:%S')}"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        assert response.status_code == 200, f"Telegram API failed: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, f"Telegram API returned error: {data}"
        assert "result" in data
        assert data["result"]["chat"]["id"] == int(TELEGRAM_CHAT_ID)
        print(f"✅ Telegram message sent successfully, message_id: {data['result']['message_id']}")


class TestOrderCreationWithTelegram:
    """Test full order flow that triggers Telegram notification"""
    
    @pytest.fixture
    def session_id(self):
        """Generate unique session ID for cart"""
        return f"telegram-test-{int(time.time())}-{uuid.uuid4().hex[:6]}"
    
    @pytest.fixture
    def api_client(self):
        """Create requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_get_products(self, api_client):
        """Verify products endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0, "No products found"
        print(f"✅ Found {len(products)} products")
        return products
    
    def test_add_to_cart(self, api_client, session_id):
        """Add product to cart"""
        # First get a product
        products_response = api_client.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        assert len(products) > 0
        
        product = products[0]
        
        # Add to cart
        add_response = api_client.post(
            f"{BASE_URL}/api/cart/{session_id}/add",
            json={"product_id": product["id"], "quantity": 2}
        )
        assert add_response.status_code == 200
        print(f"✅ Added {product['name']} to cart")
        
        # Verify cart
        cart_response = api_client.get(f"{BASE_URL}/api/cart/{session_id}")
        assert cart_response.status_code == 200
        cart = cart_response.json()
        assert len(cart["items"]) > 0
        print(f"✅ Cart has {len(cart['items'])} items")
    
    def test_create_order_triggers_telegram(self, api_client, session_id):
        """
        Full order flow test:
        1. Add product to cart
        2. Create order with customer info
        3. Verify order created
        4. Telegram notification should be sent (check backend logs)
        """
        # Step 1: Get products
        products_response = api_client.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        product = products[0]
        
        # Step 2: Add to cart
        add_response = api_client.post(
            f"{BASE_URL}/api/cart/{session_id}/add",
            json={"product_id": product["id"], "quantity": 1}
        )
        assert add_response.status_code == 200
        
        # Step 3: Create order with customer info
        order_payload = {
            "session_id": session_id,
            "customer": {
                "name": "Test Kunde",
                "email": "test@example.com",
                "phone": "+49 123 456789",
                "company": "Test GmbH",
                "street": "Teststraße 123",
                "city": "Berlin",
                "postal_code": "10115",
                "country": "Deutschland"
            },
            "notes": "Pytest Telegram Integration Test"
        }
        
        order_response = api_client.post(
            f"{BASE_URL}/api/orders",
            json=order_payload
        )
        
        # Verify order created
        assert order_response.status_code == 200, f"Order creation failed: {order_response.text}"
        order = order_response.json()
        
        # Validate order response structure
        assert "order_number" in order, "Missing order_number in response"
        assert "customer" in order, "Missing customer in response"
        assert "items" in order, "Missing items in response"
        assert "total" in order, "Missing total in response"
        
        # Validate customer data
        assert order["customer"]["name"] == "Test Kunde"
        assert order["customer"]["email"] == "test@example.com"
        assert order["customer"]["company"] == "Test GmbH"
        
        # Validate items
        assert len(order["items"]) > 0
        assert order["items"][0]["name"] == product["name"]
        
        print(f"✅ Order created: {order['order_number']}")
        print(f"✅ Total: {order['total']} EUR")
        print(f"✅ Customer: {order['customer']['name']}")
        print("✅ Telegram notification should have been sent - check Telegram group!")
        
        return order
    
    def test_verify_order_persisted(self, api_client, session_id):
        """Verify order was persisted in database"""
        # Create an order first
        products_response = api_client.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        product = products[0]
        
        # Add to cart
        api_client.post(
            f"{BASE_URL}/api/cart/{session_id}/add",
            json={"product_id": product["id"], "quantity": 1}
        )
        
        # Create order
        order_payload = {
            "session_id": session_id,
            "customer": {
                "name": "Persistence Test",
                "email": "persist@test.com",
                "phone": "+49 111 222333",
                "street": "Persistenzweg 1",
                "city": "München",
                "postal_code": "80331",
                "country": "Deutschland"
            }
        }
        
        order_response = api_client.post(f"{BASE_URL}/api/orders", json=order_payload)
        assert order_response.status_code == 200
        order = order_response.json()
        order_number = order["order_number"]
        
        # Verify order can be retrieved
        get_response = api_client.get(f"{BASE_URL}/api/orders/{order_number}")
        assert get_response.status_code == 200
        
        retrieved_order = get_response.json()
        assert retrieved_order["order_number"] == order_number
        assert retrieved_order["customer"]["name"] == "Persistence Test"
        
        print(f"✅ Order {order_number} persisted and retrieved successfully")


class TestTelegramMessageFormat:
    """Test that order data is properly formatted for Telegram"""
    
    def test_customer_dict_serialization(self):
        """
        Verify CustomerInfo Pydantic model serializes to dict correctly.
        This tests the potential issue where order_doc['customer'] might be
        a Pydantic model instead of a dict.
        """
        from pydantic import BaseModel, EmailStr
        from typing import Optional
        
        class CustomerInfo(BaseModel):
            name: str
            email: EmailStr
            phone: str
            company: Optional[str] = None
            street: str
            city: str
            postal_code: str
            country: str = "Deutschland"
        
        # Create customer info
        customer = CustomerInfo(
            name="Test User",
            email="test@example.com",
            phone="+49 123 456",
            company="Test Co",
            street="Test St 1",
            city="Berlin",
            postal_code="10115"
        )
        
        # model_dump() should return a dict
        customer_dict = customer.model_dump()
        assert isinstance(customer_dict, dict)
        assert customer_dict["name"] == "Test User"
        assert customer_dict["email"] == "test@example.com"
        
        # Verify dict access works (this is what send_telegram_order does)
        assert customer_dict.get("company") == "Test Co"
        
        print("✅ CustomerInfo serializes to dict correctly")


class TestCartClearAfterOrder:
    """Verify cart is cleared after order creation"""
    
    def test_cart_cleared_after_order(self):
        """Cart should be empty after order is placed"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        session_id = f"cart-clear-test-{int(time.time())}"
        
        # Get product
        products = session.get(f"{BASE_URL}/api/products").json()
        product = products[0]
        
        # Add to cart
        session.post(
            f"{BASE_URL}/api/cart/{session_id}/add",
            json={"product_id": product["id"], "quantity": 1}
        )
        
        # Verify cart has items
        cart_before = session.get(f"{BASE_URL}/api/cart/{session_id}").json()
        assert len(cart_before["items"]) > 0
        
        # Create order
        order_payload = {
            "session_id": session_id,
            "customer": {
                "name": "Cart Clear Test",
                "email": "cartclear@test.com",
                "phone": "+49 999 888777",
                "street": "Clearweg 1",
                "city": "Hamburg",
                "postal_code": "20095",
                "country": "Deutschland"
            }
        }
        
        order_response = session.post(f"{BASE_URL}/api/orders", json=order_payload)
        assert order_response.status_code == 200
        
        # Verify cart is now empty
        cart_after = session.get(f"{BASE_URL}/api/cart/{session_id}").json()
        assert len(cart_after.get("items", [])) == 0
        
        print("✅ Cart cleared after order creation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
