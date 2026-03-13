#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class SchutzKIAPITester:
    def __init__(self, base_url="https://versuri-qa.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"[{timestamp}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ Passed - Status: {response.status_code}")
                return True, response.json() if response.content else {}
            else:
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                self.log(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        error_detail = response.json()
                        self.log(f"   Error details: {error_detail}")
                    except:
                        self.log(f"   Response text: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.failed_tests.append(f"{name}: Exception - {str(e)}")
            self.log(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic API health"""
        return self.run_test("API Health Check", "GET", "api/", 200)

    def test_get_prompts(self):
        """Test getting available prompts"""
        return self.run_test("Get Prompts", "GET", "api/prompts", 200)

    def test_chat_basic(self):
        """Test basic chat functionality"""
        chat_data = {
            "message": "Was ist eine Haftpflichtversicherung?",
            "prompt_version": "zero-shot"
        }
        success, response = self.run_test("Basic Chat", "POST", "api/chat", 200, data=chat_data)
        if success:
            self.session_id = response.get('session_id')
            if 'response' in response and len(response['response']) > 0:
                self.log(f"   ✓ Chat response received: {response['response'][:100]}...")
                return True
            else:
                self.log(f"   ❌ Empty or missing response")
                return False
        return False

    def test_chat_with_session(self):
        """Test chat with existing session"""
        if not self.session_id:
            self.log("⚠️ Skipping session test - no session ID available")
            return False
        
        chat_data = {
            "message": "Was kostet das ungefähr?",
            "session_id": self.session_id,
            "prompt_version": "few-shot"
        }
        return self.run_test("Chat with Session", "POST", "api/chat", 200, data=chat_data)[0]

    def test_experiments(self):
        """Test experiment creation and running"""
        experiment_data = {
            "query": "Brauche ich eine Vollkasko?",
            "prompt_a_id": "zero-shot",
            "prompt_b_id": "few-shot",
            "temperature": 0.7
        }
        success, response = self.run_test("Run A/B Experiment", "POST", "api/experiments/run", 200, data=experiment_data)
        if success and 'id' in response:
            experiment_id = response['id']
            self.log(f"   ✓ Experiment created: {experiment_id}")
            
            # Verify temperature was stored
            if 'temperature' in response and response['temperature'] == 0.7:
                self.log(f"   ✓ Temperature parameter working: {response['temperature']}")
            else:
                self.log(f"   ❌ Temperature parameter missing or incorrect")
                return False
            
            # Test evaluation
            eval_success, eval_response = self.run_test("Evaluate Experiment", "POST", f"api/evaluate/{experiment_id}", 200)
            if eval_success:
                self.log(f"   ✓ Evaluation completed")
                return True
            return False
        return False

    def test_get_experiments(self):
        """Test getting experiments list"""
        return self.run_test("Get Experiments", "GET", "api/experiments", 200)[0]

    def test_get_evaluations(self):
        """Test getting evaluations list"""
        return self.run_test("Get Evaluations", "GET", "api/evaluations", 200)[0]

    def test_recommendations(self):
        """Test insurance recommendations"""
        recommend_data = {
            "age": 30,
            "household_type": "family",
            "has_car": True,
            "owns_home": True,
            "has_pets": False,
            "monthly_budget": 200
        }
        success, response = self.run_test("Get Recommendations", "POST", "api/recommend", 200, data=recommend_data)
        if success:
            if 'recommendations' in response and len(response['recommendations']) > 0:
                self.log(f"   ✓ Received {len(response['recommendations'])} recommendations")
                return True
            else:
                self.log(f"   ❌ No recommendations in response")
                return False
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test("Dashboard Stats", "GET", "api/stats", 200)
        if success:
            required_fields = ['chat_count', 'experiment_count', 'evaluation_count', 'prompt_count']
            missing_fields = [field for field in required_fields if field not in response]
            if not missing_fields:
                self.log(f"   ✓ All required stats fields present")
                return True
            else:
                self.log(f"   ❌ Missing stats fields: {missing_fields}")
                return False
        return False

    def test_prompt_management(self):
        """Test creating and deleting custom prompts"""
        # Create new prompt
        new_prompt = {
            "name": "Test Prompt",
            "description": "Ein Test-Prompt für automatisierte Tests",
            "system_prompt": "Du bist ein hilfreicher Test-Assistent.",
            "prompt_type": "zero-shot"
        }
        
        success, response = self.run_test("Create Custom Prompt", "POST", "api/prompts", 200, data=new_prompt)
        if success and 'id' in response:
            prompt_id = response['id']
            self.log(f"   ✓ Prompt created: {prompt_id}")
            
            # Delete the prompt
            delete_success = self.run_test("Delete Custom Prompt", "DELETE", f"api/prompts/{prompt_id}", 200)[0]
            if delete_success:
                self.log(f"   ✓ Prompt deleted successfully")
                return True
            return False
        return False

    def test_human_evaluation(self):
        """Test human evaluation functionality"""
        # First create an experiment
        experiment_data = {
            "query": "Was ist besser: Teilkasko oder Vollkasko?",
            "prompt_a_id": "zero-shot",
            "prompt_b_id": "few-shot",
            "temperature": 0.5
        }
        success, response = self.run_test("Create Experiment for Human Eval", "POST", "api/experiments/run", 200, data=experiment_data)
        
        if not success or 'id' not in response:
            self.log("❌ Failed to create experiment for human evaluation test")
            return False
            
        experiment_id = response['id']
        self.log(f"   ✓ Created experiment for evaluation: {experiment_id}")
        
        # Test human evaluation submission
        eval_data = {
            "experiment_id": experiment_id,
            "score_a": 8,
            "score_b": 6,
            "winner": "a",
            "feedback": "Variante A war präziser und informativer"
        }
        
        eval_success, eval_response = self.run_test("Submit Human Evaluation", "POST", "api/human-evaluate", 200, data=eval_data)
        
        if eval_success and 'id' in eval_response:
            self.log(f"   ✓ Human evaluation submitted successfully")
            
            # Test retrieving human evaluation
            get_success, get_response = self.run_test("Get Human Evaluations", "GET", f"api/human-evaluations/{experiment_id}", 200)
            if get_success and 'evaluations' in get_response:
                self.log(f"   ✓ Retrieved {len(get_response['evaluations'])} human evaluations")
                return True
            return False
        return False

    def test_prompt_improvement(self):
        """Test AI prompt improvement functionality"""
        # Get available prompts first
        success, prompts_response = self.run_test("Get Prompts for Improvement", "GET", "api/prompts", 200)
        
        if not success or 'prompts' not in prompts_response or len(prompts_response['prompts']) == 0:
            self.log("❌ No prompts available for improvement test")
            return False
        
        # Use the first available prompt
        prompt_to_improve = prompts_response['prompts'][0]
        prompt_id = prompt_to_improve['id']
        self.log(f"   ✓ Testing improvement for prompt: {prompt_to_improve['name']}")
        
        # Test prompt improvement
        improvement_data = {
            "prompt_id": prompt_id
        }
        
        success, response = self.run_test("AI Prompt Improvement", "POST", "api/prompts/improve", 200, data=improvement_data)
        
        if success:
            required_fields = ['original_prompt', 'improved_prompt', 'prompt_id', 'prompt_name']
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                self.log(f"   ✓ Improvement generated successfully")
                self.log(f"   ✓ Original prompt length: {len(response['original_prompt'])}")
                self.log(f"   ✓ Improved prompt length: {len(response['improved_prompt'])}")
                
                if len(response['improved_prompt']) > len(response['original_prompt']):
                    self.log(f"   ✓ Improved prompt appears to be enhanced")
                    return True
                else:
                    self.log(f"   ⚠️ Improved prompt may not be significantly different")
                    return True  # Still counts as success if API works
            else:
                self.log(f"   ❌ Missing improvement fields: {missing_fields}")
                return False
        return False

    def test_temperature_variations(self):
        """Test different temperature values in experiments"""
        temperatures = [0.0, 0.3, 0.7, 1.0]
        
        for temp in temperatures:
            experiment_data = {
                "query": "Wie wichtig ist eine Haftpflichtversicherung?",
                "prompt_a_id": "zero-shot",
                "prompt_b_id": "zero-shot",  # Same prompt to test temperature effect
                "temperature": temp
            }
            
            success, response = self.run_test(f"Temperature {temp} Test", "POST", "api/experiments/run", 200, data=experiment_data)
            
            if success and 'temperature' in response and response['temperature'] == temp:
                self.log(f"   ✓ Temperature {temp} working correctly")
            else:
                self.log(f"   ❌ Temperature {temp} test failed")
                return False
                
        self.log(f"   ✓ All temperature variations working")
        return True

def main():
    tester = SchutzKIAPITester()
    
    print("=" * 80)
    print("🔬 SchutzKI Backend API Test Suite")
    print("=" * 80)
    tester.log("Starting comprehensive API testing...")
    
    # Test suite
    tests = [
        ("API Health Check", tester.test_health_check),
        ("Prompt Management", tester.test_get_prompts),
        ("Basic Chat", tester.test_chat_basic),
        ("Session Chat", tester.test_chat_with_session),
        ("A/B Experiments", tester.test_experiments),
        ("Human Evaluation", tester.test_human_evaluation),
        ("AI Prompt Improvement", tester.test_prompt_improvement),
        ("Temperature Variations", tester.test_temperature_variations),
        ("Experiment History", tester.test_get_experiments),
        ("Evaluation History", tester.test_get_evaluations),
        ("Insurance Recommendations", tester.test_recommendations),
        ("Dashboard Statistics", tester.test_dashboard_stats),
        ("Custom Prompt CRUD", tester.test_prompt_management)
    ]
    
    # Run tests
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            tester.log(f"❌ {test_name} - Exception: {str(e)}")
            tester.failed_tests.append(f"{test_name}: Exception - {str(e)}")
        print("-" * 40)
    
    # Results summary
    print("=" * 80)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 80)
    tester.log(f"Tests run: {tester.tests_run}")
    tester.log(f"Tests passed: {tester.tests_passed}")
    tester.log(f"Tests failed: {len(tester.failed_tests)}")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for failure in tester.failed_tests:
            print(f"   • {failure}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    tester.log(f"Success rate: {success_rate:.1f}%")
    
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())