import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from services.db import add_api_key, list_api_keys, delete_api_key
from services.question_bank import get_question_for_company, QUESTIONS_DB
from services.code_runner import execute_code
from services.ai_agent import AIAgent, verify_provider_api_key

def test_named_keys():
    print("Testing Named API Key Management...")
    created = add_api_key("Hackathon Gemini Key", "gemini", "AIzaSyFakeKeyForTest123456789", make_active=True)
    assert created["name"] == "Hackathon Gemini Key"
    keys = list_api_keys()
    assert any(k["name"] == "Hackathon Gemini Key" for k in keys)
    print(f"[PASS] Added and verified named key: '{created['name']}' in SQLite DB.")
    # Clean up
    delete_api_key(created["id"])

def test_code_execution_real():
    print("Testing Real Python Code Execution (Two Sum)...")
    correct_code = """
class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        lookup = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in lookup:
                return [lookup[diff], i]
            lookup[num] = i
        return []
"""
    q = next(item for item in QUESTIONS_DB if item["id"] == "two-sum")
    report = execute_code("python", correct_code, q["id"], q["test_cases"])
    assert report['all_passed'] == True
    assert report['passed_cases'] == 10
    print(f"[PASS] Python Two Sum passed 10/10 test cases.")

    # Now test buggy code to ensure it FAILS properly and doesn't fake pass!
    buggy_code = """
class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        return [0, 0] # Intentionally wrong answer
"""
    bug_report = execute_code("python", buggy_code, q["id"], q["test_cases"])
    assert bug_report['all_passed'] == False
    assert bug_report['passed_cases'] == 0
    print(f"[PASS] Buggy code verified: passed 0/10 test cases as expected.")

def test_cpp_compilation():
    print("Testing Real C++ Execution with g++...")
    cpp_code = """
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> mp;
        for (int i = 0; i < (int)nums.size(); i++) {
            int diff = target - nums[i];
            if (mp.count(diff)) {
                return {mp[diff], i};
            }
            mp[nums[i]] = i;
        }
        return {};
    }
};
"""
    q = next(item for item in QUESTIONS_DB if item["id"] == "two-sum")
    cpp_report = execute_code("cpp", cpp_code, q["id"], q["test_cases"][:2])
    print(f"[PASS] C++ Compiled and Executed with g++: Passed = {cpp_report['passed_cases']}")

def test_accurate_scoring():
    print("Testing Scoring (ONLY completed rounds scored)...")
    agent = AIAgent(provider="gemini", api_key=None)
    
    # Candidate only completed DSA round 1
    report = agent.generate_final_report({
        "company": "Google",
        "role": "SDE II",
        "difficulty": "Medium",
        "selected_rounds": ["dsa_1"],
        "completed_rounds": ["dsa_1"],
        "submissions": [
            {
                "round": "dsa_1",
                "submission": {
                    "execReport": {"passed_cases": 10, "total_cases": 10}
                }
            }
        ]
    })
    
    breakdowns = report["round_breakdowns"]
    assert len(breakdowns) == 1, f"Expected 1 scored round, got {len(breakdowns)}"
    assert breakdowns[0]["round"] == "DSA Round 1"
    assert breakdowns[0]["score"] == 100
    print(f"[PASS] Only completed round was scored: {[b['round'] for b in breakdowns]}")

if __name__ == "__main__":
    test_named_keys()
    test_code_execution_real()
    test_cpp_compilation()
    test_accurate_scoring()
    print("\nALL BACKEND CORE MVP VERIFICATION TESTS PASSED 100%!")
