"""
Iteration 11 Tests: Stock management, B2C pricing text, review date, shipping modal
- Stock status display (green/orange/red)
- Cart button disabled when stock=0
- Quantity limited to max stock
- Stock decrement on order placement
- Review date editable in admin form
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStockManagement:
    """Test stock-related functionality"""
    
    def test_products_have_stock_field(self):
        """Verify products have stock field in response"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0
        
        # Check first product has stock field
        product = products[0]
        assert "stock" in product, "Product should have stock field"
        assert isinstance(product["stock"], int), "Stock should be an integer"
        print(f"Product {product['id']} has stock: {product['stock']}")
    
    def test_product_detail_has_stock(self):
        """Verify product detail endpoint returns stock"""
        response = requests.get(f"{BASE_URL}/api/products/prod-001")
        assert response.status_code == 200
        product = response.json()
        assert "stock" in product
        # Stock may have changed from previous tests, just verify it exists and is int
        assert isinstance(product["stock"], int)
        print(f"Product detail stock: {product['stock']}")
    
    def test_stock_values_exist_for_all_products(self):
        """Verify all products have stock values"""
        product_ids = ["prod-001", "prod-002", "prod-003", "prod-004", "prod-005", "prod-006"]
        
        for prod_id in product_ids:
            response = requests.get(f"{BASE_URL}/api/products/{prod_id}")
            if response.status_code == 200:
                product = response.json()
                assert "stock" in product
                assert isinstance(product["stock"], int)
                print(f"{prod_id}: stock={product['stock']}")


class TestStockDecrementOnOrder:
    """Test that stock decrements when order is placed"""
    
    def test_stock_decrements_on_order(self):
        """Place order and verify stock decrements"""
        session_id = f"test-session-{uuid.uuid4().hex[:8]}"
        
        # Get initial stock for prod-003 (has stock=8)
        response = requests.get(f"{BASE_URL}/api/products/prod-003")
        assert response.status_code == 200
        initial_stock = response.json()["stock"]
        print(f"Initial stock for prod-003: {initial_stock}")
        
        if initial_stock < 2:
            pytest.skip("Not enough stock to test decrement")
        
        # Add item to cart - correct endpoint format
        cart_response = requests.post(f"{BASE_URL}/api/cart/{session_id}/add", json={
            "product_id": "prod-003",
            "quantity": 2
        })
        assert cart_response.status_code == 200, f"Cart add failed: {cart_response.text}"
        print("Added 2 items to cart")
        
        # Place order with correct customer structure
        order_response = requests.post(f"{BASE_URL}/api/orders", json={
            "session_id": session_id,
            "customer": {
                "name": "Stock Test User",
                "email": "stocktest@example.com",
                "phone": "0123456789",
                "street": "Test Street 123",
                "city": "Berlin",
                "postal_code": "10115",
                "country": "Deutschland"
            },
            "shipping_zone": "Deutschland"
        })
        assert order_response.status_code == 200, f"Order failed: {order_response.text}"
        order = order_response.json()
        print(f"Order placed: {order['order_number']}")
        
        # Verify stock decremented
        response = requests.get(f"{BASE_URL}/api/products/prod-003")
        assert response.status_code == 200
        new_stock = response.json()["stock"]
        print(f"New stock for prod-003: {new_stock}")
        
        assert new_stock == initial_stock - 2, f"Stock should have decremented by 2. Was {initial_stock}, now {new_stock}"


class TestAdminProductReviewDate:
    """Test admin can set review date including past dates"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session with cookies"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@gpc-maschinen.de",
            "password": "GPC2026Admin!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return session
    
    def test_admin_can_update_product_with_review_date(self, admin_session):
        """Test that admin can add review with custom date"""
        # Get existing product
        response = admin_session.get(f"{BASE_URL}/api/products/prod-001")
        assert response.status_code == 200
        product = response.json()
        
        # Add a review with a past date
        past_date = "2025-01-15"
        new_review = {
            "name": "Test Reviewer",
            "text": "Great product for testing!",
            "rating": 4.5,
            "date": past_date
        }
        
        # Update product with new review
        existing_reviews = product.get("reviews", [])
        updated_reviews = existing_reviews + [new_review]
        
        update_response = admin_session.put(
            f"{BASE_URL}/api/admin/products/prod-001",
            json={
                "reviews": updated_reviews
            }
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        print(f"Updated product with review dated {past_date}")
        
        # Verify the review was saved with correct date
        verify_response = admin_session.get(f"{BASE_URL}/api/products/prod-001")
        assert verify_response.status_code == 200
        updated_product = verify_response.json()
        
        # Find our test review
        test_review = None
        for review in updated_product.get("reviews", []):
            if review.get("name") == "Test Reviewer" and review.get("date") == past_date:
                test_review = review
                break
        
        assert test_review is not None, "Review with past date should be saved"
        assert test_review["date"] == past_date, f"Review date should be {past_date}"
        print(f"Review saved with date: {test_review['date']}")
        
        # Cleanup - remove test review
        cleaned_reviews = [r for r in updated_product.get("reviews", []) if r.get("name") != "Test Reviewer"]
        admin_session.put(
            f"{BASE_URL}/api/admin/products/prod-001",
            json={"reviews": cleaned_reviews}
        )


class TestAdminUpdateStock:
    """Test admin can update product stock"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session with cookies"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@gpc-maschinen.de",
            "password": "GPC2026Admin!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return session
    
    def test_admin_can_set_stock_to_zero(self, admin_session):
        """Test admin can set stock to 0 for testing out-of-stock state"""
        # Get current stock for prod-006
        response = admin_session.get(f"{BASE_URL}/api/products/prod-006")
        assert response.status_code == 200
        original_stock = response.json()["stock"]
        print(f"Original stock for prod-006: {original_stock}")
        
        # Set stock to 0
        update_response = admin_session.put(
            f"{BASE_URL}/api/admin/products/prod-006",
            json={"stock": 0}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify stock is 0
        verify_response = admin_session.get(f"{BASE_URL}/api/products/prod-006")
        assert verify_response.status_code == 200
        assert verify_response.json()["stock"] == 0
        print("Stock set to 0 successfully")
        
        # Restore original stock
        admin_session.put(
            f"{BASE_URL}/api/admin/products/prod-006",
            json={"stock": original_stock}
        )
        print(f"Restored stock to {original_stock}")


class TestAPIEndpoints:
    """Test basic API endpoints are working"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root: {data['message']}")
    
    def test_products_list(self):
        """Test products list endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0
        print(f"Found {len(products)} products")
    
    def test_products_categories(self):
        """Test products categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        categories = response.json()
        assert len(categories) > 0
        print(f"Found {len(categories)} categories")
    
    def test_shipping_settings(self):
        """Test public shipping settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/settings/shipping")
        assert response.status_code == 200
        settings = response.json()
        assert "shipping_costs" in settings
        print(f"Shipping settings: {settings}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
