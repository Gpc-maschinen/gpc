"""
Test suite for Product Detail Page Tabs and Downloads Feature
Tests: 
- Product model accepts 'downloads' field (list of dicts with name, url, type)
- Create/update product with downloads via API
- Downloads field structure validation
- Product description with newlines
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductDownloadsBackend:
    """Test downloads field in Product model"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@gpc-maschinen.de",
            "password": "GPC2026Admin!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.test_product_ids = []
        yield
        # Cleanup test products
        for pid in self.test_product_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/products/{pid}")
            except:
                pass
    
    def test_create_product_with_downloads(self):
        """Test creating a product with downloads field"""
        test_id = f"TEST_DOWNLOADS_{uuid.uuid4().hex[:8]}"
        product_data = {
            "name": test_id,
            "description": "Test product with downloads",
            "price": 1000.0,
            "category": "Test",
            "image_url": "https://example.com/image.jpg",
            "downloads": [
                {"name": "Handbuch", "url": "https://example.com/handbuch.pdf", "type": "Handbuch"},
                {"name": "CE-Zertifikat", "url": "https://example.com/ce.pdf", "type": "CE-Zertifizierung"}
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.test_product_ids.append(data["id"])
        
        # Verify downloads field
        assert "downloads" in data, "Response missing 'downloads' field"
        assert len(data["downloads"]) == 2, f"Expected 2 downloads, got {len(data['downloads'])}"
        assert data["downloads"][0]["name"] == "Handbuch"
        assert data["downloads"][0]["type"] == "Handbuch"
        assert data["downloads"][1]["name"] == "CE-Zertifikat"
        assert data["downloads"][1]["type"] == "CE-Zertifizierung"
        print("PASS: Create product with downloads")
    
    def test_create_product_with_empty_downloads(self):
        """Test creating a product with empty downloads array"""
        test_id = f"TEST_EMPTY_DL_{uuid.uuid4().hex[:8]}"
        product_data = {
            "name": test_id,
            "description": "Test product without downloads",
            "price": 500.0,
            "category": "Test",
            "image_url": "https://example.com/image.jpg",
            "downloads": []
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.test_product_ids.append(data["id"])
        
        assert "downloads" in data
        assert data["downloads"] == []
        print("PASS: Create product with empty downloads")
    
    def test_update_product_add_downloads(self):
        """Test updating a product to add downloads"""
        # First create product without downloads
        test_id = f"TEST_ADD_DL_{uuid.uuid4().hex[:8]}"
        create_data = {
            "name": test_id,
            "description": "Product to add downloads",
            "price": 750.0,
            "category": "Test",
            "image_url": "https://example.com/image.jpg",
            "downloads": []
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/products", json=create_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        self.test_product_ids.append(product_id)
        
        # Update to add downloads
        update_data = {
            "downloads": [
                {"name": "Datenblatt", "url": "https://example.com/data.pdf", "type": "Datenblatt"},
                {"name": "Bedienungsanleitung", "url": "https://example.com/manual.pdf", "type": "Bedienungsanleitung"}
            ]
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/admin/products/{product_id}", json=update_data)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # GET to verify update was persisted
        get_response = self.session.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200
        updated_data = get_response.json()
        
        assert len(updated_data["downloads"]) == 2
        assert updated_data["downloads"][0]["type"] == "Datenblatt"
        print("PASS: Update product to add downloads")
    
    def test_update_product_remove_downloads(self):
        """Test updating a product to remove downloads"""
        # Create product with downloads
        test_id = f"TEST_REM_DL_{uuid.uuid4().hex[:8]}"
        create_data = {
            "name": test_id,
            "description": "Product to remove downloads",
            "price": 800.0,
            "category": "Test",
            "image_url": "https://example.com/image.jpg",
            "downloads": [
                {"name": "Old Doc", "url": "https://example.com/old.pdf", "type": "PDF"}
            ]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/products", json=create_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        self.test_product_ids.append(product_id)
        
        # Update to remove downloads
        update_response = self.session.put(f"{BASE_URL}/api/admin/products/{product_id}", json={"downloads": []})
        assert update_response.status_code == 200
        
        # GET to verify update was persisted
        get_response = self.session.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200
        updated_data = get_response.json()
        
        assert updated_data["downloads"] == []
        print("PASS: Update product to remove downloads")
    
    def test_download_types_all_options(self):
        """Test all download type options: Handbuch, CE-Zertifizierung, Datenblatt, Bedienungsanleitung, PDF, Sonstiges"""
        test_id = f"TEST_DL_TYPES_{uuid.uuid4().hex[:8]}"
        all_types = ["Handbuch", "CE-Zertifizierung", "Datenblatt", "Bedienungsanleitung", "PDF", "Sonstiges"]
        
        downloads = [{"name": f"Doc {t}", "url": f"https://example.com/{t.lower()}.pdf", "type": t} for t in all_types]
        
        product_data = {
            "name": test_id,
            "description": "Product with all download types",
            "price": 1200.0,
            "category": "Test",
            "image_url": "https://example.com/image.jpg",
            "downloads": downloads
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.test_product_ids.append(data["id"])
        
        assert len(data["downloads"]) == 6
        saved_types = [dl["type"] for dl in data["downloads"]]
        for t in all_types:
            assert t in saved_types, f"Type '{t}' not saved"
        print("PASS: All download types saved correctly")
    
    def test_product_description_with_newlines(self):
        """Test product description with multiple newlines"""
        test_id = f"TEST_NEWLINES_{uuid.uuid4().hex[:8]}"
        description_with_newlines = "Zeile 1: Produktbeschreibung\nZeile 2: Technische Details\nZeile 3: Anwendungsbereich\n\nZeile 5: Nach Leerzeile"
        
        product_data = {
            "name": test_id,
            "description": description_with_newlines,
            "price": 999.0,
            "category": "Test",
            "image_url": "https://example.com/image.jpg"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.test_product_ids.append(data["id"])
        
        # Verify newlines are preserved
        assert "\n" in data["description"], "Newlines not preserved in description"
        lines = data["description"].split("\n")
        assert len(lines) == 5, f"Expected 5 lines, got {len(lines)}"
        print("PASS: Description with newlines preserved")
    
    def test_get_product_includes_downloads(self):
        """Test that GET product endpoint returns downloads field"""
        # Create product with downloads
        test_id = f"TEST_GET_DL_{uuid.uuid4().hex[:8]}"
        product_data = {
            "name": test_id,
            "description": "Test GET downloads",
            "price": 600.0,
            "category": "Test",
            "image_url": "https://example.com/image.jpg",
            "downloads": [{"name": "Test Doc", "url": "https://example.com/test.pdf", "type": "PDF"}]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        self.test_product_ids.append(product_id)
        
        # GET the product
        get_response = self.session.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert "downloads" in data
        assert len(data["downloads"]) == 1
        assert data["downloads"][0]["name"] == "Test Doc"
        print("PASS: GET product includes downloads")
    
    def test_product_list_includes_downloads(self):
        """Test that product list endpoint returns downloads field"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) > 0, "No products found"
        
        # Check first product has downloads field
        assert "downloads" in products[0], "Product list missing 'downloads' field"
        print("PASS: Product list includes downloads field")
    
    def test_download_structure_validation(self):
        """Test that downloads have correct structure: name, url, type"""
        test_id = f"TEST_DL_STRUCT_{uuid.uuid4().hex[:8]}"
        product_data = {
            "name": test_id,
            "description": "Test download structure",
            "price": 450.0,
            "category": "Test",
            "image_url": "https://example.com/image.jpg",
            "downloads": [
                {"name": "Complete Doc", "url": "https://example.com/complete.pdf", "type": "Handbuch"}
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert response.status_code == 200
        
        data = response.json()
        self.test_product_ids.append(data["id"])
        
        dl = data["downloads"][0]
        assert "name" in dl, "Download missing 'name' field"
        assert "url" in dl, "Download missing 'url' field"
        assert "type" in dl, "Download missing 'type' field"
        assert dl["name"] == "Complete Doc"
        assert dl["url"] == "https://example.com/complete.pdf"
        assert dl["type"] == "Handbuch"
        print("PASS: Download structure validated")


class TestProductWithSalePriceAndRating:
    """Test that sale_price and rating still work correctly with new features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@gpc-maschinen.de",
            "password": "GPC2026Admin!"
        })
        assert login_response.status_code == 200
        self.test_product_ids = []
        yield
        for pid in self.test_product_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/products/{pid}")
            except:
                pass
    
    def test_product_with_all_features(self):
        """Test product with sale_price, rating, reviews, and downloads"""
        test_id = f"TEST_ALL_FEAT_{uuid.uuid4().hex[:8]}"
        product_data = {
            "name": test_id,
            "description": "Line 1\nLine 2\nLine 3",
            "price": 2000.0,
            "sale_price": 1500.0,
            "rating": 4.5,
            "category": "Test",
            "image_url": "https://example.com/image.jpg",
            "reviews": [
                {"name": "Test User", "text": "Great product!", "rating": 5, "date": "2026-01-15"}
            ],
            "downloads": [
                {"name": "Manual", "url": "https://example.com/manual.pdf", "type": "Handbuch"}
            ],
            "specifications": {
                "Allgemein": {"Gewicht": "100 kg", "Maße": "100x50x30 cm"}
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/products", json=product_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.test_product_ids.append(data["id"])
        
        # Verify all fields
        assert data["price"] == 2000.0
        assert data["sale_price"] == 1500.0
        assert data["rating"] == 4.5
        assert len(data["reviews"]) == 1
        assert len(data["downloads"]) == 1
        assert "Allgemein" in data["specifications"]
        assert "\n" in data["description"]
        print("PASS: Product with all features created successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
