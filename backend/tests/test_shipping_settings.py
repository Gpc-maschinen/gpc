"""
Test suite for Shipping Settings and Admin Settings features
Tests: Admin settings CRUD, public shipping endpoint, order creation with shipping
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@gpc-maschinen.de"
ADMIN_PASSWORD = "GPC2026Admin!"


class TestPublicShippingEndpoint:
    """Tests for GET /api/settings/shipping (public endpoint)"""
    
    def test_get_shipping_settings_returns_200(self):
        """Public shipping endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/settings/shipping")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_get_shipping_settings_structure(self):
        """Shipping settings should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/settings/shipping")
        data = response.json()
        
        assert "shipping_costs" in data, "Missing shipping_costs field"
        assert "free_shipping_threshold" in data, "Missing free_shipping_threshold field"
        assert "shipping_note" in data, "Missing shipping_note field"
        assert isinstance(data["shipping_costs"], list), "shipping_costs should be a list"


class TestAdminAuthentication:
    """Tests for admin login"""
    
    def test_admin_login_success(self):
        """Admin should be able to login with correct credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user" in data or "email" in data, "Login response missing user data"
        
    def test_admin_login_sets_cookie(self):
        """Admin login should set auth cookie"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        # Check if session has cookies
        assert len(session.cookies) > 0 or 'set-cookie' in response.headers or response.headers.get('set-cookie'), "No auth cookie set"


class TestAdminSettingsEndpoints:
    """Tests for admin settings CRUD operations"""
    
    @pytest.fixture
    def admin_session(self):
        """Create authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return session
    
    def test_get_admin_settings(self, admin_session):
        """Admin should be able to get settings"""
        response = admin_session.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "shipping_costs" in data or "type" in data, "Settings response missing expected fields"
        
    def test_update_shipping_costs(self, admin_session):
        """Admin should be able to add shipping zones"""
        test_zone = f"TEST_Zone_{uuid.uuid4().hex[:6]}"
        test_cost = 9.90
        
        # First get current settings
        get_response = admin_session.get(f"{BASE_URL}/api/admin/settings")
        current_settings = get_response.json()
        
        # Add new shipping zone
        new_shipping_costs = current_settings.get("shipping_costs", []) + [{"zone": test_zone, "cost": test_cost}]
        
        update_response = admin_session.put(f"{BASE_URL}/api/admin/settings", json={
            "shipping_costs": new_shipping_costs,
            "free_shipping_threshold": current_settings.get("free_shipping_threshold", 0),
            "shipping_note": current_settings.get("shipping_note", "")
        })
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify via public endpoint
        public_response = requests.get(f"{BASE_URL}/api/settings/shipping")
        public_data = public_response.json()
        zones = [sc["zone"] for sc in public_data["shipping_costs"]]
        assert test_zone in zones, f"Test zone {test_zone} not found in shipping costs"
        
        # Cleanup - remove test zone
        cleaned_costs = [sc for sc in new_shipping_costs if sc["zone"] != test_zone]
        admin_session.put(f"{BASE_URL}/api/admin/settings", json={
            "shipping_costs": cleaned_costs,
            "free_shipping_threshold": current_settings.get("free_shipping_threshold", 0),
            "shipping_note": current_settings.get("shipping_note", "")
        })
        
    def test_update_free_shipping_threshold(self, admin_session):
        """Admin should be able to set free shipping threshold"""
        # Get current settings
        get_response = admin_session.get(f"{BASE_URL}/api/admin/settings")
        current_settings = get_response.json()
        original_threshold = current_settings.get("free_shipping_threshold", 0)
        
        # Update threshold
        test_threshold = 500.0
        update_response = admin_session.put(f"{BASE_URL}/api/admin/settings", json={
            "shipping_costs": current_settings.get("shipping_costs", []),
            "free_shipping_threshold": test_threshold,
            "shipping_note": current_settings.get("shipping_note", "")
        })
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify via public endpoint
        public_response = requests.get(f"{BASE_URL}/api/settings/shipping")
        public_data = public_response.json()
        assert public_data["free_shipping_threshold"] == test_threshold, f"Threshold not updated: {public_data}"
        
        # Restore original
        admin_session.put(f"{BASE_URL}/api/admin/settings", json={
            "shipping_costs": current_settings.get("shipping_costs", []),
            "free_shipping_threshold": original_threshold,
            "shipping_note": current_settings.get("shipping_note", "")
        })
        
    def test_update_shipping_note(self, admin_session):
        """Admin should be able to set shipping note"""
        # Get current settings
        get_response = admin_session.get(f"{BASE_URL}/api/admin/settings")
        current_settings = get_response.json()
        original_note = current_settings.get("shipping_note", "")
        
        # Update note
        test_note = f"TEST_NOTE_{uuid.uuid4().hex[:6]}: Lieferung per Spedition"
        update_response = admin_session.put(f"{BASE_URL}/api/admin/settings", json={
            "shipping_costs": current_settings.get("shipping_costs", []),
            "free_shipping_threshold": current_settings.get("free_shipping_threshold", 0),
            "shipping_note": test_note
        })
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify via public endpoint
        public_response = requests.get(f"{BASE_URL}/api/settings/shipping")
        public_data = public_response.json()
        assert public_data["shipping_note"] == test_note, f"Note not updated: {public_data}"
        
        # Restore original
        admin_session.put(f"{BASE_URL}/api/admin/settings", json={
            "shipping_costs": current_settings.get("shipping_costs", []),
            "free_shipping_threshold": current_settings.get("free_shipping_threshold", 0),
            "shipping_note": original_note
        })


class TestOrderWithShipping:
    """Tests for order creation with shipping costs"""
    
    @pytest.fixture
    def admin_session(self):
        """Create authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return session
    
    @pytest.fixture
    def setup_shipping_zone(self, admin_session):
        """Setup a test shipping zone for order tests"""
        test_zone = "TEST_Deutschland"
        test_cost = 9.90
        
        # Get current settings
        get_response = admin_session.get(f"{BASE_URL}/api/admin/settings")
        current_settings = get_response.json()
        
        # Add test zone if not exists
        existing_zones = [sc["zone"] for sc in current_settings.get("shipping_costs", [])]
        if test_zone not in existing_zones:
            new_costs = current_settings.get("shipping_costs", []) + [{"zone": test_zone, "cost": test_cost}]
            admin_session.put(f"{BASE_URL}/api/admin/settings", json={
                "shipping_costs": new_costs,
                "free_shipping_threshold": current_settings.get("free_shipping_threshold", 0),
                "shipping_note": current_settings.get("shipping_note", "")
            })
        
        yield {"zone": test_zone, "cost": test_cost}
        
        # Cleanup - remove test zone
        get_response = admin_session.get(f"{BASE_URL}/api/admin/settings")
        current_settings = get_response.json()
        cleaned_costs = [sc for sc in current_settings.get("shipping_costs", []) if sc["zone"] != test_zone]
        admin_session.put(f"{BASE_URL}/api/admin/settings", json={
            "shipping_costs": cleaned_costs,
            "free_shipping_threshold": current_settings.get("free_shipping_threshold", 0),
            "shipping_note": current_settings.get("shipping_note", "")
        })
    
    def test_order_includes_shipping_fields(self, admin_session, setup_shipping_zone):
        """Order should include shipping_zone, shipping_cost, and subtotal"""
        session_id = f"TEST_SESSION_{uuid.uuid4().hex[:8]}"
        
        # Get a product to add to cart
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        if not products:
            pytest.skip("No products available for testing")
        
        product = products[0]
        
        # Add to cart
        cart_response = requests.post(f"{BASE_URL}/api/cart/{session_id}/add", json={
            "product_id": product["id"],
            "quantity": 1
        })
        assert cart_response.status_code == 200, f"Add to cart failed: {cart_response.text}"
        
        # Create order with shipping zone
        order_data = {
            "session_id": session_id,
            "customer": {
                "name": "TEST_Kunde",
                "email": "test@example.com",
                "phone": "+49123456789",
                "company": "TEST GmbH",
                "street": "Teststraße 1",
                "city": "Berlin",
                "postal_code": "10115",
                "country": "Deutschland"
            },
            "shipping_zone": setup_shipping_zone["zone"],
            "notes": "TEST ORDER - Please delete"
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        assert order_response.status_code == 200, f"Order creation failed: {order_response.text}"
        
        order = order_response.json()
        
        # Verify shipping fields
        assert "shipping_zone" in order, "Order missing shipping_zone"
        assert "shipping_cost" in order, "Order missing shipping_cost"
        assert "subtotal" in order, "Order missing subtotal"
        # Shipping zone may have "(Kostenloser Versand)" appended if free shipping threshold is met
        assert setup_shipping_zone["zone"] in order["shipping_zone"], f"Wrong shipping zone: {order['shipping_zone']}"
        # Shipping cost may be 0 if free shipping threshold is met
        assert order["shipping_cost"] >= 0, f"Invalid shipping cost: {order['shipping_cost']}"
        assert order["total"] == order["subtotal"] + order["shipping_cost"], f"Total calculation wrong: {order['total']} != {order['subtotal']} + {order['shipping_cost']}"


class TestCategoriesEndpoint:
    """Tests for categories endpoint used by ProductsPage tiles"""
    
    def test_get_categories_returns_200(self):
        """Categories endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_get_categories_returns_list(self):
        """Categories should be a list of strings"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        data = response.json()
        assert isinstance(data, list), "Categories should be a list"
        if len(data) > 0:
            assert isinstance(data[0], str), "Category items should be strings"


class TestProductsFiltering:
    """Tests for products filtering by category"""
    
    def test_get_products_returns_200(self):
        """Products endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_filter_products_by_category(self):
        """Products should be filterable by category"""
        # Get categories first
        categories_response = requests.get(f"{BASE_URL}/api/products/categories")
        categories = categories_response.json()
        
        if not categories:
            pytest.skip("No categories available")
        
        # Filter by first category
        category = categories[0]
        response = requests.get(f"{BASE_URL}/api/products", params={"category": category})
        assert response.status_code == 200
        
        products = response.json()
        # All returned products should be in the requested category
        for product in products:
            assert product["category"] == category, f"Product {product['id']} has wrong category: {product['category']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
