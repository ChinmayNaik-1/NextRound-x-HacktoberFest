import sys
import os
import subprocess
import tempfile
import time
import json
import re
from typing import Dict, Any, List

def normalize_output(s: str) -> str:
    if s is None:
        return ""
    clean = s.strip()
    if clean in ("True", "true"):
        return "true"
    if clean in ("False", "false"):
        return "false"
    
    # Try JSON parsing (handles arrays like [0, 1] vs [0,1])
    try:
        parsed = json.loads(clean)
        if isinstance(parsed, list):
            # Sort if it's unordered indices or normalize
            return json.dumps(parsed)
        return json.dumps(parsed, sort_keys=True)
    except Exception:
        # Check float equivalence
        try:
            val = float(clean)
            return str(round(val, 4))
        except Exception:
            return clean

# -------------------- PYTHON RUNNER --------------------

def wrap_python_code(user_code: str) -> str:
    harness = f"""
import sys
import json

{user_code}

def main():
    raw = sys.stdin.read().strip()
    if not raw:
        return
    lines = [l.strip() for l in raw.split('\\n') if l.strip()]
    sol = Solution()
    
    if hasattr(sol, 'twoSum'):
        nums = json.loads(lines[0])
        target = int(lines[1])
        res = sol.twoSum(nums, target)
        print(json.dumps(res))
    elif hasattr(sol, 'lengthOfLongestSubstring'):
        s = json.loads(lines[0]) if lines[0].startswith('"') else lines[0]
        res = sol.lengthOfLongestSubstring(s)
        print(res)
    elif hasattr(sol, 'trap'):
        height = json.loads(lines[0])
        res = sol.trap(height)
        print(res)
    elif hasattr(sol, 'isAnagram'):
        s = json.loads(lines[0]) if lines[0].startswith('"') else lines[0]
        t = json.loads(lines[1]) if lines[1].startswith('"') else lines[1]
        res = sol.isAnagram(s, t)
        print("true" if res else "false")
    elif hasattr(sol, 'coinChange'):
        coins = json.loads(lines[0])
        amount = int(lines[1])
        res = sol.coinChange(coins, amount)
        print(res)
    elif hasattr(sol, 'findMedianSortedArrays'):
        nums1 = json.loads(lines[0])
        nums2 = json.loads(lines[1])
        res = sol.findMedianSortedArrays(nums1, nums2)
        print(round(float(res), 5))
    else:
        methods = [m for m in dir(sol) if not m.startswith('_')]
        if methods:
            fn = getattr(sol, methods[0])
            args = []
            for l in lines:
                try:
                    args.append(json.loads(l))
                except Exception:
                    args.append(l)
            res = fn(*args)
            print(json.dumps(res) if isinstance(res, (list, dict)) else res)

if __name__ == '__main__':
    main()
"""
    return harness

def run_python_solution(user_code: str, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    full_script = wrap_python_code(user_code)
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as f:
        f.write(full_script)
        script_path = f.name
        
    results = []
    all_passed = True
    
    try:
        for idx, tc in enumerate(test_cases):
            tc_input = tc["input"]
            expected = normalize_output(tc["expected"])
            hidden = tc.get("hidden", False)
            
            start_t = time.time()
            try:
                python_command = (
                    [sys.executable, "--run-python", script_path]
                    if getattr(sys, "frozen", False)
                    else [sys.executable, script_path]
                )
                proc = subprocess.run(
                    python_command,
                    input=tc_input,
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                dur_ms = max(1, int((time.time() - start_t) * 1000))
                
                if proc.returncode != 0:
                    err = proc.stderr.strip().replace(script_path, "solution.py")
                    results.append({
                        "test_index": idx + 1,
                        "hidden": hidden,
                        "input": tc_input if not hidden else "[Hidden]",
                        "expected": tc["expected"] if not hidden else "[Hidden]",
                        "actual": None,
                        "passed": False,
                        "execution_time_ms": dur_ms,
                        "error": err or "Runtime error"
                    })
                    all_passed = False
                else:
                    actual_raw = proc.stdout.strip()
                    actual_norm = normalize_output(actual_raw)
                    passed = (actual_norm == expected)
                    if not passed:
                        all_passed = False
                    results.append({
                        "test_index": idx + 1,
                        "hidden": hidden,
                        "input": tc_input if not hidden else "[Hidden]",
                        "expected": tc["expected"] if not hidden else "[Hidden]",
                        "actual": actual_raw if not hidden else ("[Hidden Result]" if not passed else "[Passed]"),
                        "passed": passed,
                        "execution_time_ms": dur_ms,
                        "error": None
                    })
            except subprocess.TimeoutExpired:
                all_passed = False
                results.append({
                    "test_index": idx + 1,
                    "hidden": hidden,
                    "input": tc_input if not hidden else "[Hidden]",
                    "expected": tc["expected"] if not hidden else "[Hidden]",
                    "actual": None,
                    "passed": False,
                    "execution_time_ms": 3000,
                    "error": "Time Limit Exceeded (> 3.0s)"
                })
    finally:
        try:
            os.remove(script_path)
        except Exception:
            pass

    passed_count = sum(1 for r in results if r["passed"])
    return {
        "language": "python",
        "all_passed": all_passed,
        "total_cases": len(test_cases),
        "passed_cases": passed_count,
        "results": results
    }

# -------------------- C++ RUNNER --------------------

def run_cpp_solution(user_code: str, test_cases: List[Dict[str, Any]], question_id: str = "") -> Dict[str, Any]:
    # Check if g++ available
    try:
        subprocess.run(["g++.exe", "--version"], capture_output=True, check=True)
    except Exception:
        return {
            "language": "cpp",
            "all_passed": False,
            "total_cases": len(test_cases),
            "passed_cases": 0,
            "results": [],
            "compilation_error": "g++ compiler not found in system PATH."
        }
        
    temp_dir = tempfile.mkdtemp()
    src_file = os.path.join(temp_dir, "solution.cpp")
    exe_file = os.path.join(temp_dir, "solution.exe")

    # Generate complete C++ harness that handles inputs
    code_lower = user_code.lower()
    if "coinchange" in code_lower or "coin" in question_id:
        dispatch_block = """
        vector<int> coins = parseVectorInt(line1);
        int amount = stoi(line2);
        int res = sol.coinChange(coins, amount);
        cout << res << endl;
        return 0;
        """
    elif "twosum" in code_lower or "two-sum" in question_id:
        dispatch_block = """
        vector<int> nums = parseVectorInt(line1);
        int target = stoi(line2);
        vector<int> res = sol.twoSum(nums, target);
        cout << "[";
        for (size_t i = 0; i < res.size(); i++) {
            cout << res[i] << (i + 1 < res.size() ? ", " : "");
        }
        cout << "]" << endl;
        return 0;
        """
    elif "lengthoflongestsubstring" in code_lower or "substring" in question_id:
        dispatch_block = """
        string s = stripQuotes(line1);
        int res = sol.lengthOfLongestSubstring(s);
        cout << res << endl;
        return 0;
        """
    elif "trap" in code_lower or "rain" in question_id:
        dispatch_block = """
        vector<int> height = parseVectorInt(line1);
        int res = sol.trap(height);
        cout << res << endl;
        return 0;
        """
    elif "isanagram" in code_lower or "anagram" in question_id:
        dispatch_block = """
        string s = stripQuotes(line1);
        string t = stripQuotes(line2);
        bool res = sol.isAnagram(s, t);
        cout << (res ? "true" : "false") << endl;
        return 0;
        """
    elif "findmediansortedarrays" in code_lower or "median" in question_id:
        dispatch_block = """
        vector<int> nums1 = parseVectorInt(line1);
        vector<int> nums2 = parseVectorInt(line2);
        double res = sol.findMedianSortedArrays(nums1, nums2);
        cout << res << endl;
        return 0;
        """
    else:
        dispatch_block = """
        cout << 0 << endl;
        return 0;
        """

    harness = f"""
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <unordered_map>
using namespace std;

{user_code}

vector<int> parseVectorInt(string s) {{
    vector<int> res;
    string cur = "";
    for (char c : s) {{
        if (isdigit(c) || c == '-') {{
            cur += c;
        }} else if (cur.length() > 0) {{
            res.push_back(stoi(cur));
            cur = "";
        }}
    }}
    if (cur.length() > 0) res.push_back(stoi(cur));
    return res;
}}

string stripQuotes(string s) {{
    if (s.length() >= 2 && s.front() == '"' && s.back() == '"') {{
        return s.substr(1, s.length() - 2);
    }}
    return s;
}}

int main() {{
    string line1, line2;
    if (!getline(cin, line1)) return 0;
    getline(cin, line2);

    Solution sol;
    {dispatch_block}
}}
"""
    with open(src_file, "w", encoding="utf-8") as f:
        f.write(harness)

    comp = subprocess.run(["g++.exe", "-O2", src_file, "-o", exe_file], capture_output=True, text=True)
    if comp.returncode != 0:
        return {
            "language": "cpp",
            "all_passed": False,
            "total_cases": len(test_cases),
            "passed_cases": 0,
            "results": [],
            "compilation_error": comp.stderr
        }

    results = []
    all_passed = True
    for idx, tc in enumerate(test_cases):
        hidden = tc.get("hidden", False)
        start_t = time.time()
        try:
            proc = subprocess.run([exe_file], input=tc["input"], capture_output=True, text=True, timeout=3)
            dur_ms = max(1, int((time.time() - start_t) * 1000))
            if proc.returncode != 0:
                all_passed = False
                results.append({
                    "test_index": idx + 1,
                    "hidden": hidden,
                    "input": tc["input"] if not hidden else "[Hidden]",
                    "expected": tc["expected"] if not hidden else "[Hidden]",
                    "actual": None,
                    "passed": False,
                    "execution_time_ms": dur_ms,
                    "error": proc.stderr.strip() or "Runtime error"
                })
            else:
                actual_raw = proc.stdout.strip()
                actual_norm = normalize_output(actual_raw)
                expected = normalize_output(tc["expected"])
                passed = (actual_norm == expected)
                if not passed:
                    all_passed = False
                results.append({
                    "test_index": idx + 1,
                    "hidden": hidden,
                    "input": tc["input"] if not hidden else "[Hidden]",
                    "expected": tc["expected"] if not hidden else "[Hidden]",
                    "actual": actual_raw if not hidden else ("[Hidden Result]" if not passed else "[Passed]"),
                    "passed": passed,
                    "execution_time_ms": dur_ms,
                    "error": None
                })
        except subprocess.TimeoutExpired:
            all_passed = False
            results.append({
                "test_index": idx + 1,
                "hidden": hidden,
                "input": tc["input"] if not hidden else "[Hidden]",
                "expected": tc["expected"] if not hidden else "[Hidden]",
                "actual": None,
                "passed": False,
                "execution_time_ms": 3000,
                "error": "Time Limit Exceeded (> 3.0s)"
            })

    passed_count = sum(1 for r in results if r["passed"])
    return {
        "language": "cpp",
        "all_passed": all_passed,
        "total_cases": len(test_cases),
        "passed_cases": passed_count,
        "results": results
    }

# -------------------- JAVA RUNNER --------------------

def run_java_solution(user_code: str, test_cases: List[Dict[str, Any]], question_id: str = "") -> Dict[str, Any]:
    try:
        subprocess.run(["javac", "-version"], capture_output=True, check=True)
    except Exception:
        return {
            "language": "java",
            "all_passed": False,
            "total_cases": len(test_cases),
            "passed_cases": 0,
            "results": [],
            "compilation_error": "javac compiler not found in system PATH."
        }

    temp_dir = tempfile.mkdtemp()
    src_file = os.path.join(temp_dir, "SolutionRunner.java")

    # If user code has class Solution, strip public to avoid file name mismatch
    clean_code = re.sub(r'public\s+class\s+Solution', 'class Solution', user_code)

    harness = f"""
import java.util.*;
import java.io.*;
import java.lang.reflect.*;

{clean_code}

public class SolutionRunner {{
    public static void main(String[] args) throws Exception {{
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        List<String> lines = new ArrayList<>();
        String line;
        while ((line = br.readLine()) != null) {{
            if (!line.trim().isEmpty()) lines.add(line.trim());
        }}
        if (lines.isEmpty()) return;

        Solution sol = new Solution();
        Method target = null;
        for (Method m : Solution.class.getDeclaredMethods()) {{
            String name = m.getName();
            if (!name.equals("rec") && !name.equals("helper") && !name.equals("main") && !name.startsWith("$")) {{
                target = m;
                break;
            }}
        }}
        if (target == null && Solution.class.getDeclaredMethods().length > 0) {{
            target = Solution.class.getDeclaredMethods()[0];
        }}
        if (target == null) return;
        target.setAccessible(true);

        Class<?>[] pTypes = target.getParameterTypes();
        Object[] mArgs = new Object[pTypes.length];
        for (int i = 0; i < pTypes.length; i++) {{
            String s = i < lines.size() ? lines.get(i) : "";
            Class<?> p = pTypes[i];
            if (p == int.class || p == Integer.class) {{
                mArgs[i] = Integer.parseInt(s.replaceAll("[^0-9-]", ""));
            }} else if (p == String.class) {{
                mArgs[i] = s.replaceAll("^\\"|\\"$", "");
            }} else if (p == int[].class) {{
                String clean = s.replace("[", "").replace("]", "").trim();
                if (clean.isEmpty()) {{
                    mArgs[i] = new int[0];
                }} else {{
                    String[] parts = clean.split(",");
                    int[] arr = new int[parts.length];
                    for (int j = 0; j < parts.length; j++) arr[j] = Integer.parseInt(parts[j].trim());
                    mArgs[i] = arr;
                }}
            }} else if (p == boolean.class || p == Boolean.class) {{
                mArgs[i] = Boolean.parseBoolean(s);
            }}
        }}

        Object res = target.invoke(sol, mArgs);
        if (res instanceof int[]) {{
            System.out.println(Arrays.toString((int[]) res));
        }} else {{
            System.out.println(res);
        }}
    }}
}}
"""
    with open(src_file, "w", encoding="utf-8") as f:
        f.write(harness)

    comp = subprocess.run(["javac", src_file], capture_output=True, text=True, cwd=temp_dir)
    if comp.returncode != 0:
        return {
            "language": "java",
            "all_passed": False,
            "total_cases": len(test_cases),
            "passed_cases": 0,
            "results": [],
            "compilation_error": comp.stderr
        }

    results = []
    all_passed = True
    for idx, tc in enumerate(test_cases):
        hidden = tc.get("hidden", False)
        start_t = time.time()
        try:
            proc = subprocess.run(
                ["java", "-cp", temp_dir, "SolutionRunner"],
                input=tc["input"],
                capture_output=True,
                text=True,
                timeout=4
            )
            dur_ms = max(1, int((time.time() - start_t) * 1000))
            if proc.returncode != 0:
                all_passed = False
                results.append({
                    "test_index": idx + 1,
                    "hidden": hidden,
                    "input": tc["input"] if not hidden else "[Hidden]",
                    "expected": tc["expected"] if not hidden else "[Hidden]",
                    "actual": None,
                    "passed": False,
                    "execution_time_ms": dur_ms,
                    "error": proc.stderr.strip() or "Runtime error"
                })
            else:
                actual_raw = proc.stdout.strip()
                actual_norm = normalize_output(actual_raw)
                expected = normalize_output(tc["expected"])
                passed = (actual_norm == expected)
                if not passed:
                    all_passed = False
                results.append({
                    "test_index": idx + 1,
                    "hidden": hidden,
                    "input": tc["input"] if not hidden else "[Hidden]",
                    "expected": tc["expected"] if not hidden else "[Hidden]",
                    "actual": actual_raw if not hidden else ("[Hidden Result]" if not passed else "[Passed]"),
                    "passed": passed,
                    "execution_time_ms": dur_ms,
                    "error": None
                })
        except subprocess.TimeoutExpired:
            all_passed = False
            results.append({
                "test_index": idx + 1,
                "hidden": hidden,
                "input": tc["input"] if not hidden else "[Hidden]",
                "expected": tc["expected"] if not hidden else "[Hidden]",
                "actual": None,
                "passed": False,
                "execution_time_ms": 4000,
                "error": "Time Limit Exceeded (> 4.0s)"
            })

    passed_count = sum(1 for r in results if r["passed"])
    return {
        "language": "java",
        "all_passed": all_passed,
        "total_cases": len(test_cases),
        "passed_cases": passed_count,
        "results": results
    }

# -------------------- MAIN ENTRY --------------------

def execute_code(language: str, code: str, question_id: str, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    lang = (language or "python").lower().strip()
    if lang == "python":
        return run_python_solution(code, test_cases)
    elif lang in ("cpp", "c++"):
        return run_cpp_solution(code, test_cases, question_id)
    elif lang == "java":
        return run_java_solution(code, test_cases, question_id)
    else:
        return {
            "language": language,
            "all_passed": False,
            "total_cases": len(test_cases),
            "passed_cases": 0,
            "results": [],
            "compilation_error": f"Unsupported language: {language}"
        }
