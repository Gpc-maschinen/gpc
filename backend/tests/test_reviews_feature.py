"""
Test suite for Product Reviews Feature
Tests: Backend API for creating/updating products with reviews, review data structure validation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@gpc-maschinen.de"
ADMIN_PASSWORD = "GPC2026Admin!"


@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session for admin operations"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return session


@pytest.fixture
def test_product_id():
    """Generate unique product ID for testing"""
    return f"TEST_REVIEW_{uuid.uuid4().hex[:8]}"


class TestProductReviewsBackend:
    """Backend API tests for product reviews feature"""
    
    def test_create_product_with_reviews(self, auth_session, test_product_id):
        """Test creating a product with reviews via API"""
        reviews = [
            {
                "name": "Hans Müller",
                "text": "Ausgezeichnete Maschine, sehr zufrieden!",
                "rating": 5.0,
                "date": "2026-01-15"
            },
            {
                "name": "Maria Schmidt",
                "text": "Gute Qualität, schnelle Lieferung.",
                "rating": 4.0,
                "date": "2026-01-10"
            }
        ]
        
        product_data = {
            "name": f"Test Product {test_product_id}",
            "description": "Test product with reviews",
            "price": 10000.00,
            "category": "Baumaschinen",
            "image_url": "https://example.com/test.jpg",
            "reviews": reviews,
            "stock": 5
        }
        
        # Create product
        response = auth_session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        assert "id" in created
        assert created["reviews"] == reviews
        assert len(created["reviews"]) == 2
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/products/{created['id']}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched["reviews"] == reviews
        assert fetched["reviews"][0]["name"] == "Hans Müller"
        assert fetched["reviews"][0]["rating"] == 5.0
        assert fetched["reviews"][1]["name"] == "Maria Schmidt"
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/admin/products/{created['id']}")
        print(f"✓ Created product with {len(reviews)} reviews successfully")
    
    def test_create_product_without_reviews(self, auth_session, test_product_id):
        """Test creating a product without reviews (empty array)"""
        product_data = {
            "name": f"Test No Reviews {test_product_id}",
            "description": "Test product without reviews",
            "price": 5000.00,
            "category": "CNC-Maschinen",
            "image_url": "https://example.com/test2.jpg",
            "stock": 3
        }
        
        response = auth_session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        assert created["reviews"] == []
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/admin/products/{created['id']}")
        print("✓ Created product without reviews (empty array) successfully")
    
    def test_update_product_add_reviews(self, auth_session, test_product_id):
        """Test updating a product to add reviews"""
        # First create product without reviews
        product_data = {
            "name": f"Test Update Reviews {test_product_id}",
            "description": "Test product for update",
            "price": 15000.00,
            "category": "Robotik",
            "image_url": "https://example.com/test3.jpg",
            "reviews": [],
            "stock": 2
        }
        
        create_response = auth_session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Update with reviews
        new_reviews = [
            {
                "name": "Peter Weber",
                "text": "Sehr gute Maschine für den Preis.",
                "rating": 4.5,
                "date": "2026-01-20"
            }
        ]
        
        update_response = auth_session.put(
            f"{BASE_URL}/api/admin/products/{product_id}",
            json={"reviews": new_reviews}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200
        
        updated = get_response.json()
        assert len(updated["reviews"]) == 1
        assert updated["reviews"][0]["name"] == "Peter Weber"
        assert updated["reviews"][0]["rating"] == 4.5
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
        print("✓ Updated product to add reviews successfully")
    
    def test_update_product_add_multiple_reviews(self, auth_session, test_product_id):
        """Test adding multiple reviews to a product"""
        # Create product with one review
        initial_reviews = [
            {
                "name": "Initial Reviewer",
                "text": "First review",
                "rating": 3.0,
                "date": "2026-01-01"
            }
        ]
        
        product_data = {
            "name": f"Test Multiple Reviews {test_product_id}",
            "description": "Test product for multiple reviews",
            "price": 20000.00,
            "category": "Blechbearbeitung",
            "image_url": "https://example.com/test4.jpg",
            "reviews": initial_reviews,
            "stock": 4
        }
        
        create_response = auth_session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Update with more reviews
        all_reviews = initial_reviews + [
            {
                "name": "Second Reviewer",
                "text": "Second review added",
                "rating": 5.0,
                "date": "2026-01-15"
            },
            {
                "name": "Third Reviewer",
                "text": "Third review added",
                "rating": 4.0,
                "date": "2026-01-20"
            }
        ]
        
        update_response = auth_session.put(
            f"{BASE_URL}/api/admin/products/{product_id}",
            json={"reviews": all_reviews}
        )
        assert update_response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        updated = get_response.json()
        assert len(updated["reviews"]) == 3
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
        print("✓ Added multiple reviews to product successfully")
    
    def test_update_product_remove_reviews(self, auth_session, test_product_id):
        """Test removing reviews from a product"""
        # Create product with reviews
        initial_reviews = [
            {"name": "Review 1", "text": "Text 1", "rating": 5.0, "date": "2026-01-01"},
            {"name": "Review 2", "text": "Text 2", "rating": 4.0, "date": "2026-01-02"},
            {"name": "Review 3", "text": "Text 3", "rating": 3.0, "date": "2026-01-03"}
        ]
        
        product_data = {
            "name": f"Test Remove Reviews {test_product_id}",
            "description": "Test product for removing reviews",
            "price": 25000.00,
            "category": "Lasertechnik",
            "image_url": "https://example.com/test5.jpg",
            "reviews": initial_reviews,
            "stock": 1
        }
        
        create_response = auth_session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Remove one review (keep only first two)
        remaining_reviews = initial_reviews[:2]
        
        update_response = auth_session.put(
            f"{BASE_URL}/api/admin/products/{product_id}",
            json={"reviews": remaining_reviews}
        )
        assert update_response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        updated = get_response.json()
        assert len(updated["reviews"]) == 2
        assert updated["reviews"][0]["name"] == "Review 1"
        assert updated["reviews"][1]["name"] == "Review 2"
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
        print("✓ Removed reviews from product successfully")
    
    def test_review_data_structure(self, auth_session, test_product_id):
        """Test that review data structure is correct (name, text, rating, date)"""
        review = {
            "name": "Test Customer",
            "text": "This is a detailed review text with special characters: äöü ß €",
            "rating": 4.5,
            "date": "2026-01-25"
        }
        
        product_data = {
            "name": f"Test Review Structure {test_product_id}",
            "description": "Test product for review structure",
            "price": 30000.00,
            "category": "Baumaschinen",
            "image_url": "https://example.com/test6.jpg",
            "reviews": [review],
            "stock": 2
        }
        
        create_response = auth_session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Verify structure
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        fetched = get_response.json()
        
        assert len(fetched["reviews"]) == 1
        fetched_review = fetched["reviews"][0]
        
        # Check all required fields
        assert "name" in fetched_review
        assert "text" in fetched_review
        assert "rating" in fetched_review
        assert "date" in fetched_review
        
        # Check values
        assert fetched_review["name"] == "Test Customer"
        assert "äöü ß €" in fetched_review["text"]
        assert fetched_review["rating"] == 4.5
        assert fetched_review["date"] == "2026-01-25"
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
        print("✓ Review data structure validated successfully")
    
    def test_reviews_persist_after_reload(self, auth_session, test_product_id):
        """Test that reviews persist after product save/reload"""
        reviews = [
            {"name": "Persistent Review", "text": "This should persist", "rating": 5.0, "date": "2026-01-30"}
        ]
        
        product_data = {
            "name": f"Test Persistence {test_product_id}",
            "description": "Test product for persistence",
            "price": 35000.00,
            "category": "CNC-Maschinen",
            "image_url": "https://example.com/test7.jpg",
            "reviews": reviews,
            "stock": 3
        }
        
        # Create
        create_response = auth_session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # First fetch
        get_response1 = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response1.status_code == 200
        assert get_response1.json()["reviews"] == reviews
        
        # Update other field (not reviews)
        auth_session.put(
            f"{BASE_URL}/api/admin/products/{product_id}",
            json={"price": 36000.00}
        )
        
        # Second fetch - reviews should still be there
        get_response2 = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response2.status_code == 200
        assert get_response2.json()["reviews"] == reviews
        assert get_response2.json()["price"] == 36000.00
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
        print("✓ Reviews persist after product reload successfully")
    
    def test_product_list_includes_reviews(self, auth_session, test_product_id):
        """Test that product list endpoint includes reviews field"""
        reviews = [
            {"name": "List Test", "text": "Review in list", "rating": 4.0, "date": "2026-01-28"}
        ]
        
        product_data = {
            "name": f"Test List Reviews {test_product_id}",
            "description": "Test product for list",
            "price": 40000.00,
            "category": "Robotik",
            "image_url": "https://example.com/test8.jpg",
            "reviews": reviews,
            "stock": 2
        }
        
        # Create
        create_response = auth_session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Get all products
        list_response = requests.get(f"{BASE_URL}/api/products")
        assert list_response.status_code == 200
        
        products = list_response.json()
        test_product = next((p for p in products if p["id"] == product_id), None)
        
        assert test_product is not None
        assert "reviews" in test_product
        assert test_product["reviews"] == reviews
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
        print("✓ Product list includes reviews field successfully")
    
    def test_rating_values_in_reviews(self, auth_session, test_product_id):
        """Test various rating values (1-5) in reviews"""
        reviews = [
            {"name": "Rating 1", "text": "One star", "rating": 1.0, "date": "2026-01-01"},
            {"name": "Rating 2.5", "text": "Two and half stars", "rating": 2.5, "date": "2026-01-02"},
            {"name": "Rating 3", "text": "Three stars", "rating": 3.0, "date": "2026-01-03"},
            {"name": "Rating 4.5", "text": "Four and half stars", "rating": 4.5, "date": "2026-01-04"},
            {"name": "Rating 5", "text": "Five stars", "rating": 5.0, "date": "2026-01-05"}
        ]
        
        product_data = {
            "name": f"Test Rating Values {test_product_id}",
            "description": "Test product for rating values",
            "price": 45000.00,
            "category": "Blechbearbeitung",
            "image_url": "https://example.com/test9.jpg",
            "reviews": reviews,
            "stock": 1
        }
        
        create_response = auth_session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        fetched = get_response.json()
        
        assert len(fetched["reviews"]) == 5
        ratings = [r["rating"] for r in fetched["reviews"]]
        assert 1.0 in ratings
        assert 2.5 in ratings
        assert 3.0 in ratings
        assert 4.5 in ratings
        assert 5.0 in ratings
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
        print("✓ Various rating values (1-5) stored correctly")


class TestExistingProductsReviews:
    """Test reviews field on existing products"""
    
    def test_existing_products_have_reviews_field(self):
        """Test that existing products have reviews field (empty array)"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) > 0
        
        for product in products:
            assert "reviews" in product, f"Product {product['id']} missing reviews field"
            assert isinstance(product["reviews"], list), f"Product {product['id']} reviews is not a list"
        
        print(f"✓ All {len(products)} existing products have reviews field")
    
    def test_product_detail_has_reviews_field(self):
        """Test that product detail endpoint returns reviews field"""
        # Get first product
        list_response = requests.get(f"{BASE_URL}/api/products")
        products = list_response.json()
        
        if products:
            product_id = products[0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert detail_response.status_code == 200
            
            product = detail_response.json()
            assert "reviews" in product
            assert isinstance(product["reviews"], list)
            
            print(f"✓ Product detail endpoint returns reviews field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
