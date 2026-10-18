import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from services.question_bank import get_question_for_company, QUESTIONS_DB
from services.code_runner import execute_code
from services.ai_agent import AIAgent

def test_question_bank():
    print("Testing Question Bank...")
    q = get_question_for_company("Google", "Medium")
    assert q is not None, "Failed to get question for Google"
    assert len(q["test_cases"]) == 10, f"Expected 10 test cases, got {len(q['test_cases'])}"
    print(f"[PASS] Found question: {q['title']} with {len(q['test_cases'])} test cases.")

def test_code_execution():
    print("Testing Code Runner (Python Two Sum)...")
    code = """
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
    report = execute_code("python", code, q["id"], q["test_cases"])
    print(f"[PASS] Execution Report: {report['passed_cases']}/{report['total_cases']} Passed! All passed: {report['all_passed']}")
    assert report['all_passed'], "Expected all test cases to pass"

def test_ai_agent():
    print("Testing AI Agent...")
    agent = AIAgent(provider="gemini", api_key=None) # Tests offline resilient agent
    q = next(item for item in QUESTIONS_DB if item["id"] == "two-sum")
    dummy_report = {"passed_cases": 10, "total_cases": 10, "compilation_error": None}
    analysis = agent.analyze_dsa_code(q, "code", "python", dummy_report)
    assert "time_complexity" in analysis, "Missing time_complexity"
    assert "follow_up_questions" in analysis, "Missing follow_up_questions"
    print(f"[PASS] Approach Analysis: {analysis['time_complexity']}")
    print(f"[PASS] Follow-up Question: {analysis['follow_up_questions'][0]}")

    report = agent.generate_final_report({
        "company": "Google",
        "role": "SDE II",
        "difficulty": "Medium",
        "selected_rounds": ["dsa_1", "technical", "hr"],
        "transcripts": []
    })
    assert "overall_score" in report, "Missing overall score"
    print(f"[PASS] Generated Score Card: Overall Score = {report['overall_score']} ({report['hiring_recommendation']})")

if __name__ == "__main__":
    test_question_bank()
    test_code_execution()
    test_ai_agent()
    print("\nALL BACKEND INTEGRATION TESTS PASSED 100%!")
