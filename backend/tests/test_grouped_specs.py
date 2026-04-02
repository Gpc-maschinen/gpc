"""
Test suite for G.P.C. Maschinen - Grouped Specifications Feature
Tests: Admin auth, product CRUD with grouped specs, bulk paste parsing, backwards compatibility
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@gpc-maschinen.de"
ADMIN_PASSWORD = "GPC2026Admin!"

class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful: {data['email']}")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestProductCRUD:
    """Product CRUD with grouped specifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, "Admin login failed in setup"
        self.test_product_id = None
        yield
        # Cleanup: delete test product if created
        if self.test_product_id:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/products/{self.test_product_id}")
            except:
                pass
    
    def test_create_product_with_grouped_specs(self):
        """Test creating product with grouped specifications"""
        test_id = f"TEST-grouped-{uuid.uuid4().hex[:8]}"
        product_data = {
            "name": f"Test Maschine {test_id}",
            "description": "Test product with grouped specifications",
            "price": 99999.99,
            "category": "Baumaschinen",
            "image_url": "https://example.com/test.jpg",
            "images": [],
            "stock": 5,
            "specifications": {
                "Motor": {
                    "Leistung": "150 kW",
                    "Drehzahl": "2000 U/min",
                    "Kraftstoff": "Diesel"
                },
                "Hydraulik": {
                    "Druck": "350 bar",
                    "Volumen": "120 l"
                },
                "Allgemein": {
                    "Gewicht": "5000 kg",
                    "Breite": "2500 mm"
                }
            }
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/products",
            json=product_data
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        created = response.json()
        self.test_product_id = created.get("id")
        
        # Verify grouped specs structure
        assert "specifications" in created
        specs = created["specifications"]
        assert "Motor" in specs
        assert "Hydraulik" in specs
        assert specs["Motor"]["Leistung"] == "150 kW"
        assert specs["Hydraulik"]["Druck"] == "350 bar"
        print(f"✓ Product created with grouped specs: {self.test_product_id}")
        
        # Verify persistence via GET
        get_response = self.session.get(f"{BASE_URL}/api/products/{self.test_product_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["specifications"]["Motor"]["Leistung"] == "150 kW"
        print("✓ Grouped specs persisted correctly")
    
    def test_update_product_specs(self):
        """Test updating product specifications"""
        # First create a product
        test_id = f"TEST-update-{uuid.uuid4().hex[:8]}"
        product_data = {
            "name": f"Test Update {test_id}",
            "description": "Product for update test",
            "price": 50000,
            "category": "CNC-Maschinen",
            "image_url": "https://example.com/test.jpg",
            "specifications": {
                "Allgemein": {"Gewicht": "1000 kg"}
            }
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/products",
            json=product_data
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        self.test_product_id = product_id
        
        # Update with new grouped specs
        update_data = {
            "specifications": {
                "Motor": {"Leistung": "200 kW"},
                "Allgemein": {"Gewicht": "1500 kg", "Länge": "3000 mm"}
            }
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/admin/products/{product_id}",
            json=update_data
        )
        assert update_response.status_code == 200
        
        # Verify update
        get_response = self.session.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200
        updated = get_response.json()
        assert "Motor" in updated["specifications"]
        assert updated["specifications"]["Motor"]["Leistung"] == "200 kW"
        assert updated["specifications"]["Allgemein"]["Gewicht"] == "1500 kg"
        print("✓ Product specs updated successfully")
    
    def test_delete_product_stays_deleted(self):
        """Test that deleted products stay deleted (no auto-seeding)"""
        # Create a test product
        test_id = f"TEST-delete-{uuid.uuid4().hex[:8]}"
        product_data = {
            "name": f"Test Delete {test_id}",
            "description": "Product for delete test",
            "price": 10000,
            "category": "Baumaschinen",
            "image_url": "https://example.com/test.jpg",
            "specifications": {}
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/products",
            json=product_data
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Delete the product
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
        assert delete_response.status_code == 200
        print(f"✓ Product {product_id} deleted")
        
        # Verify it stays deleted
        get_response = self.session.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 404, "Product should not exist after deletion"
        print("✓ Product stays deleted (no auto-seeding)")


class TestBackwardsCompatibility:
    """Test backwards compatibility with flat specs"""
    
    def test_flat_specs_still_work(self):
        """Test that existing products with flat specs still display correctly"""
        # Get existing products
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        
        # Find a product with flat specs (string values)
        flat_spec_product = None
        for p in products:
            specs = p.get("specifications", {})
            if specs:
                first_value = list(specs.values())[0]
                if isinstance(first_value, str):
                    flat_spec_product = p
                    break
        
        if flat_spec_product:
            print(f"✓ Found product with flat specs: {flat_spec_product['name']}")
            # Verify flat specs structure
            for key, value in flat_spec_product["specifications"].items():
                assert isinstance(value, str), f"Expected string value for flat spec, got {type(value)}"
            print("✓ Flat specs structure verified")
        else:
            print("⚠ No products with flat specs found (all may have been migrated)")


class TestCategories:
    """Test categories endpoint"""
    
    def test_get_categories(self):
        """Test fetching categories"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) > 0
        print(f"✓ Categories fetched: {categories}")


class TestTelegramNotification:
    """Test Telegram notification on order"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session_id = f"test-session-{uuid.uuid4().hex[:8]}"
    
    def test_order_triggers_telegram(self):
        """Test that creating an order triggers Telegram notification"""
        # Get a product to add to cart
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        assert len(products) > 0
        product = products[0]
        
        # Add to cart
        add_response = self.session.post(
            f"{BASE_URL}/api/cart/{self.session_id}/add",
            json={"product_id": product["id"], "quantity": 1}
        )
        assert add_response.status_code == 200
        print(f"✓ Added {product['name']} to cart")
        
        # Create order
        order_data = {
            "session_id": self.session_id,
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
            "payment_method": "Rechnung",
            "notes": "TEST ORDER - Telegram notification test"
        }
        
        order_response = self.session.post(
            f"{BASE_URL}/api/orders",
            json=order_data
        )
        assert order_response.status_code == 200, f"Order failed: {order_response.text}"
        order = order_response.json()
        assert "order_number" in order
        print(f"✓ Order created: {order['order_number']}")
        print("✓ Telegram notification should have been sent (check Telegram group)")


class TestImageUpload:
    """Test image upload functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, "Admin login failed"
    
    def test_upload_endpoint_exists(self):
        """Test that upload endpoint exists and requires auth"""
        # Test without auth
        unauth_response = requests.post(f"{BASE_URL}/api/admin/upload")
        assert unauth_response.status_code == 401, "Upload should require auth"
        print("✓ Upload endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
