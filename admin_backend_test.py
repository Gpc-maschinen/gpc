#!/usr/bin/env python3
"""
Admin Backend API Testing for German Machinery E-commerce Store
Tests all admin API endpoints including authentication and CRUD operations
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class AdminAPITester:
    def __init__(self, base_url="https://industrial-store-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_credentials = {
            "email": "admin@gpc-maschinen.de",
            "password": "GPC2026Admin!"
        }
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.access_token = None

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

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200, auth_required: bool = False) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        # Add authorization if required
        if auth_required and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers, timeout=10)
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

    def test_admin_login(self):
        """Test admin login functionality"""
        success, data, error = self.make_request('POST', '/auth/login', self.admin_credentials)
        
        if success and data:
            # Check if response contains admin user data
            if 'email' in data and 'role' in data and data['role'] == 'admin':
                self.log_test("Admin login successful", True, f"Admin: {data['email']}")
                return True
            else:
                self.log_test("Admin login", False, "Login successful but missing admin role")
                return False
        else:
            self.log_test("Admin login", False, error)
            return False

    def test_admin_me(self):
        """Test admin user info endpoint"""
        success, data, error = self.make_request('GET', '/auth/me', auth_required=True)
        
        if success and data:
            if 'email' in data and 'role' in data and data['role'] == 'admin':
                self.log_test("Admin user info", True, f"Authenticated as: {data['email']}")
                return True
            else:
                self.log_test("Admin user info", False, "Missing admin role in response")
                return False
        else:
            self.log_test("Admin user info", False, error)
            return False

    def test_admin_stats(self):
        """Test admin dashboard stats"""
        success, data, error = self.make_request('GET', '/admin/stats', auth_required=True)
        
        if success and data:
            required_stats = ['products', 'categories', 'orders', 'quotes']
            if all(stat in data for stat in required_stats):
                self.log_test("Admin dashboard stats", True, 
                            f"Products: {data['products']}, Categories: {data['categories']}, Orders: {data['orders']}, Quotes: {data['quotes']}")
                return data
            else:
                self.log_test("Admin dashboard stats", False, "Missing required stats fields")
                return None
        else:
            self.log_test("Admin dashboard stats", False, error)
            return None

    def test_admin_products_list(self):
        """Test admin products list"""
        success, data, error = self.make_request('GET', '/admin/products', auth_required=True)
        
        if success and isinstance(data, list):
            self.log_test("Admin products list", True, f"Found {len(data)} products")
            return data
        else:
            self.log_test("Admin products list", False, error)
            return []

    def test_admin_categories_list(self):
        """Test admin categories list"""
        success, data, error = self.make_request('GET', '/admin/categories', auth_required=True)
        
        if success and isinstance(data, list):
            self.log_test("Admin categories list", True, f"Found {len(data)} categories")
            return data
        else:
            self.log_test("Admin categories list", False, error)
            return []

    def test_admin_orders_list(self):
        """Test admin orders list"""
        success, data, error = self.make_request('GET', '/admin/orders', auth_required=True)
        
        if success and isinstance(data, list):
            self.log_test("Admin orders list", True, f"Found {len(data)} orders")
            return data
        else:
            self.log_test("Admin orders list", False, error)
            return []

    def test_admin_quotes_list(self):
        """Test admin quotes list"""
        success, data, error = self.make_request('GET', '/admin/quotes', auth_required=True)
        
        if success and isinstance(data, list):
            self.log_test("Admin quotes list", True, f"Found {len(data)} quotes")
            return data
        else:
            self.log_test("Admin quotes list", False, error)
            return []

    def test_admin_create_category(self):
        """Test admin category creation"""
        test_category = {
            "name": "Test Kategorie",
            "description": "Test-Kategorie für API-Tests",
            "image_url": "https://example.com/test.jpg"
        }
        
        success, data, error = self.make_request('POST', '/admin/categories', test_category, 200, auth_required=True)
        
        if success and data and 'id' in data:
            self.log_test("Admin create category", True, f"Created category: {data['name']}")
            return data['id']
        else:
            self.log_test("Admin create category", False, error)
            return None

    def test_admin_update_category(self, category_id):
        """Test admin category update"""
        if not category_id:
            self.log_test("Admin update category", False, "No category ID available")
            return False
        
        update_data = {
            "name": "Updated Test Kategorie",
            "description": "Aktualisierte Test-Kategorie",
            "image_url": "https://example.com/updated.jpg"
        }
        
        success, data, error = self.make_request('PUT', f'/admin/categories/{category_id}', update_data, auth_required=True)
        
        if success:
            self.log_test("Admin update category", True)
            return True
        else:
            self.log_test("Admin update category", False, error)
            return False

    def test_admin_delete_category(self, category_id):
        """Test admin category deletion"""
        if not category_id:
            self.log_test("Admin delete category", False, "No category ID available")
            return False
        
        success, data, error = self.make_request('DELETE', f'/admin/categories/{category_id}', auth_required=True)
        
        if success:
            self.log_test("Admin delete category", True)
            return True
        else:
            self.log_test("Admin delete category", False, error)
            return False

    def test_admin_create_product(self):
        """Test admin product creation with multiple images"""
        test_product = {
            "name": "Test Maschine XY-2026",
            "description": "Test-Maschine für API-Tests mit erweiterten Funktionen",
            "price": 125000.00,
            "category": "Test Kategorie",
            "image_url": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
            "images": [
                "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
                "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800"
            ],
            "specifications": {
                "Leistung": "150 kW",
                "Gewicht": "5000 kg",
                "Baujahr": "2026"
            },
            "stock": 5
        }
        
        success, data, error = self.make_request('POST', '/admin/products', test_product, 200, auth_required=True)
        
        if success and data and 'id' in data:
            # Check if multiple images are supported
            if 'images' in data and isinstance(data['images'], list):
                self.log_test("Admin create product with multiple images", True, f"Created product: {data['name']}")
            else:
                self.log_test("Admin create product", True, f"Created product: {data['name']} (no multiple images support)")
            return data['id']
        else:
            self.log_test("Admin create product", False, error)
            return None

    def test_admin_update_product(self, product_id):
        """Test admin product update"""
        if not product_id:
            self.log_test("Admin update product", False, "No product ID available")
            return False
        
        update_data = {
            "name": "Updated Test Maschine XY-2026",
            "price": 135000.00,
            "stock": 3,
            "images": [
                "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
                "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800",
                "https://images.unsplash.com/photo-1691052657402-90b45c0f6dca?w=800"
            ]
        }
        
        success, data, error = self.make_request('PUT', f'/admin/products/{product_id}', update_data, auth_required=True)
        
        if success:
            self.log_test("Admin update product", True)
            return True
        else:
            self.log_test("Admin update product", False, error)
            return False

    def test_admin_delete_product(self, product_id):
        """Test admin product deletion"""
        if not product_id:
            self.log_test("Admin delete product", False, "No product ID available")
            return False
        
        success, data, error = self.make_request('DELETE', f'/admin/products/{product_id}', auth_required=True)
        
        if success:
            self.log_test("Admin delete product", True)
            return True
        else:
            self.log_test("Admin delete product", False, error)
            return False

    def test_admin_logout(self):
        """Test admin logout"""
        success, data, error = self.make_request('POST', '/auth/logout')
        
        if success:
            self.log_test("Admin logout", True)
            return True
        else:
            self.log_test("Admin logout", False, error)
            return False

    def test_protected_route_without_auth(self):
        """Test that protected routes require authentication"""
        # Clear session to test without auth
        temp_session = requests.Session()
        
        try:
            response = temp_session.get(f"{self.api_url}/admin/stats", timeout=10)
            if response.status_code == 401:
                self.log_test("Protected route security", True, "Correctly returns 401 without auth")
                return True
            else:
                self.log_test("Protected route security", False, f"Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Protected route security", False, f"Request failed: {str(e)}")
            return False

    def run_all_admin_tests(self):
        """Run comprehensive admin API test suite"""
        print("🔐 Starting Admin Panel API Tests")
        print(f"Testing API at: {self.api_url}")
        print(f"Admin credentials: {self.admin_credentials['email']}")
        print("-" * 60)
        
        # Test authentication
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return 1
        
        # Test protected route security
        self.test_protected_route_without_auth()
        
        # Test admin user info
        self.test_admin_me()
        
        # Test admin dashboard
        stats = self.test_admin_stats()
        
        # Test admin CRUD operations
        products = self.test_admin_products_list()
        categories = self.test_admin_categories_list()
        orders = self.test_admin_orders_list()
        quotes = self.test_admin_quotes_list()
        
        # Test category CRUD
        category_id = self.test_admin_create_category()
        if category_id:
            self.test_admin_update_category(category_id)
            self.test_admin_delete_category(category_id)
        
        # Test product CRUD with multiple images
        product_id = self.test_admin_create_product()
        if product_id:
            self.test_admin_update_product(product_id)
            self.test_admin_delete_product(product_id)
        
        # Test logout
        self.test_admin_logout()
        
        # Print summary
        print("-" * 60)
        print(f"📊 Admin Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All admin tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} admin tests failed")
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
    tester = AdminAPITester()
    exit_code = tester.run_all_admin_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open('/app/admin_backend_test_results.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())