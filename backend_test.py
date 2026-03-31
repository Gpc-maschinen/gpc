#!/usr/bin/env python3
"""
Backend API Testing for German Machinery E-commerce Store
Tests all API endpoints for functionality and German language content
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class MaschinenStoreAPITester:
    def __init__(self, base_url="https://industrial-store-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_id = f"test-session-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_customer = {
            "name": "Max Mustermann",
            "email": "max.mustermann@test.de",
            "phone": "+49 123 456789",
            "company": "Test GmbH",
            "street": "Teststraße 123",
            "city": "München",
            "postal_code": "80331",
            "country": "Deutschland"
        }

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, None, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = response.text

            if not success:
                return False, response_data, f"Expected {expected_status}, got {response.status_code}"
            
            return True, response_data, ""
            
        except requests.exceptions.RequestException as e:
            return False, None, f"Request failed: {str(e)}"

    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, data, error = self.make_request('GET', '/')
        
        if success and data and 'message' in data:
            # Check for German welcome message
            if 'Willkommen' in data['message']:
                self.log_test("Root endpoint with German message", True)
            else:
                self.log_test("Root endpoint", True, "Missing German welcome message")
        else:
            self.log_test("Root endpoint", False, error)

    def test_products_endpoint(self):
        """Test products listing endpoint"""
        success, data, error = self.make_request('GET', '/products')
        
        if success and isinstance(data, list) and len(data) > 0:
            # Check if products have German content
            first_product = data[0]
            required_fields = ['id', 'name', 'description', 'price', 'category', 'image_url']
            
            if all(field in first_product for field in required_fields):
                # Check for German product names/descriptions
                german_indicators = ['Maschine', 'Bagger', 'CNC', 'Roboter', 'Laser']
                has_german = any(indicator in first_product.get('name', '') + first_product.get('description', '') 
                               for indicator in german_indicators)
                
                if has_german:
                    self.log_test("Products endpoint with German content", True, f"Found {len(data)} products")
                else:
                    self.log_test("Products endpoint", True, "Products found but may lack German content")
            else:
                self.log_test("Products endpoint", False, "Missing required product fields")
        else:
            self.log_test("Products endpoint", False, error or "No products returned")
        
        return data if success else []

    def test_product_categories(self):
        """Test product categories endpoint"""
        success, data, error = self.make_request('GET', '/products/categories')
        
        if success and isinstance(data, list) and len(data) > 0:
            # Check for German category names
            german_categories = ['Baumaschinen', 'CNC-Maschinen', 'Robotik', 'Lasertechnik', 'Blechbearbeitung']
            has_german_categories = any(cat in data for cat in german_categories)
            
            if has_german_categories:
                self.log_test("Product categories with German names", True, f"Categories: {data}")
            else:
                self.log_test("Product categories", True, f"Categories found: {data}")
        else:
            self.log_test("Product categories", False, error)

    def test_product_detail(self, products):
        """Test individual product detail endpoint"""
        if not products:
            self.log_test("Product detail", False, "No products available for testing")
            return None
            
        product_id = products[0]['id']
        success, data, error = self.make_request('GET', f'/products/{product_id}')
        
        if success and data:
            # Check product has specifications and German content
            if 'specifications' in data and data['specifications']:
                self.log_test("Product detail with specifications", True, f"Product: {data.get('name', 'Unknown')}")
            else:
                self.log_test("Product detail", True, "Product found but no specifications")
            return data
        else:
            self.log_test("Product detail", False, error)
            return None

    def test_cart_operations(self, product):
        """Test cart CRUD operations"""
        if not product:
            self.log_test("Cart operations", False, "No product available for cart testing")
            return
        
        product_id = product['id']
        
        # Test get empty cart
        success, data, error = self.make_request('GET', f'/cart/{self.session_id}')
        if success:
            self.log_test("Get empty cart", True)
        else:
            self.log_test("Get empty cart", False, error)
        
        # Test add to cart
        add_data = {"product_id": product_id, "quantity": 2}
        success, data, error = self.make_request('POST', f'/cart/{self.session_id}/add', add_data)
        if success:
            self.log_test("Add to cart", True)
        else:
            self.log_test("Add to cart", False, error)
            return
        
        # Test get cart with items
        success, cart_data, error = self.make_request('GET', f'/cart/{self.session_id}')
        if success and cart_data and 'items' in cart_data and len(cart_data['items']) > 0:
            self.log_test("Get cart with items", True, f"Total: {cart_data.get('total', 0)}")
        else:
            self.log_test("Get cart with items", False, error)
        
        # Test update cart item
        update_data = {"product_id": product_id, "quantity": 3}
        success, data, error = self.make_request('PUT', f'/cart/{self.session_id}/update', update_data)
        if success:
            self.log_test("Update cart item", True)
        else:
            self.log_test("Update cart item", False, error)
        
        # Test remove from cart
        success, data, error = self.make_request('DELETE', f'/cart/{self.session_id}/remove/{product_id}')
        if success:
            self.log_test("Remove from cart", True)
        else:
            self.log_test("Remove from cart", False, error)

    def test_order_creation(self, product):
        """Test order creation process"""
        if not product:
            self.log_test("Order creation", False, "No product available for order testing")
            return None
        
        # First add item to cart
        add_data = {"product_id": product['id'], "quantity": 1}
        success, _, error = self.make_request('POST', f'/cart/{self.session_id}/add', add_data)
        if not success:
            self.log_test("Order creation - cart setup", False, error)
            return None
        
        # Create order
        order_data = {
            "session_id": self.session_id,
            "customer": self.test_customer,
            "notes": "Test-Bestellung für API-Tests"
        }
        
        success, data, error = self.make_request('POST', '/orders', order_data, 200)
        if success and data and 'order_number' in data:
            order_number = data['order_number']
            
            # Check for German order fields
            german_fields = ['payment_method', 'status']
            has_german = any(field in data and 'Rechnung' in str(data.get(field, '')) or 'Ausstehend' in str(data.get(field, ''))
                           for field in german_fields)
            
            if has_german:
                self.log_test("Order creation with German content", True, f"Order: {order_number}")
            else:
                self.log_test("Order creation", True, f"Order: {order_number}")
            
            return order_number
        else:
            self.log_test("Order creation", False, error)
            return None

    def test_order_retrieval(self, order_number):
        """Test order retrieval"""
        if not order_number:
            self.log_test("Order retrieval", False, "No order number available")
            return
        
        success, data, error = self.make_request('GET', f'/orders/{order_number}')
        if success and data:
            # Check order has customer and items
            if 'customer' in data and 'items' in data and 'total' in data:
                self.log_test("Order retrieval with complete data", True)
            else:
                self.log_test("Order retrieval", True, "Order found but incomplete data")
        else:
            self.log_test("Order retrieval", False, error)

    def test_quote_request(self, product):
        """Test quote request creation"""
        if not product:
            self.log_test("Quote request", False, "No product available for quote testing")
            return
        
        quote_data = {
            "product_id": product['id'],
            "customer": self.test_customer,
            "quantity": 2,
            "message": "Bitte senden Sie mir ein individuelles Angebot für diese Maschine."
        }
        
        success, data, error = self.make_request('POST', '/quotes', quote_data, 200)
        if success and data and 'quote_number' in data:
            # Check for German quote fields
            if 'ANF-' in data['quote_number']:  # German quote number prefix
                self.log_test("Quote request with German format", True, f"Quote: {data['quote_number']}")
            else:
                self.log_test("Quote request", True, f"Quote: {data['quote_number']}")
        else:
            self.log_test("Quote request", False, error)

    def test_contact_form(self):
        """Test contact form submission"""
        contact_data = {
            "name": "Test Kunde",
            "email": "test@example.de",
            "phone": "+49 123 456789",
            "subject": "Anfrage zu Ihren Maschinen",
            "message": "Ich interessiere mich für Ihre Industriemaschinen und hätte gerne weitere Informationen."
        }
        
        success, data, error = self.make_request('POST', '/contact', contact_data, 200)
        if success and data:
            self.log_test("Contact form submission", True)
        else:
            self.log_test("Contact form submission", False, error)

    def test_product_filtering(self):
        """Test product filtering functionality"""
        # Test category filter
        success, data, error = self.make_request('GET', '/products?category=Baumaschinen')
        if success and isinstance(data, list):
            if len(data) > 0:
                self.log_test("Product category filter", True, f"Found {len(data)} Baumaschinen")
            else:
                self.log_test("Product category filter", True, "No Baumaschinen found (expected)")
        else:
            self.log_test("Product category filter", False, error)
        
        # Test price filter
        success, data, error = self.make_request('GET', '/products?min_price=100000&max_price=200000')
        if success and isinstance(data, list):
            self.log_test("Product price filter", True, f"Found {len(data)} products in price range")
        else:
            self.log_test("Product price filter", False, error)

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        print("🚀 Starting German Machinery Store API Tests")
        print(f"Testing API at: {self.api_url}")
        print(f"Session ID: {self.session_id}")
        print("-" * 60)
        
        # Test basic endpoints
        self.test_root_endpoint()
        
        # Test product endpoints
        products = self.test_products_endpoint()
        self.test_product_categories()
        self.test_product_filtering()
        
        # Test product detail
        product = self.test_product_detail(products)
        
        # Test cart operations
        self.test_cart_operations(product)
        
        # Test order workflow
        order_number = self.test_order_creation(product)
        self.test_order_retrieval(order_number)
        
        # Test quote request
        self.test_quote_request(product)
        
        # Test contact form
        self.test_contact_form()
        
        # Print summary
        print("-" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

    def get_test_summary(self):
        """Get detailed test summary"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_details": self.test_results
        }

def main():
    """Main test execution"""
    tester = MaschinenStoreAPITester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open('/app/backend_test_results.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())