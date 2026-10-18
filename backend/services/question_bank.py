import random
from typing import Dict, Any, List, Optional

QUESTIONS_DB: List[Dict[str, Any]] = [
    {
        "id": "two-sum",
        "title": "Two Sum",
        "companies": ["Google", "Amazon", "Meta", "Apple", "Microsoft", "Uber"],
        "difficulty": "Easy",
        "topic": "Arrays & Hashing",
        "description": """### Description
Given an array of integers `nums` and an integer `target`, return *indices of the two numbers such that they add up to `target`*.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

### Examples

**Example 1:**
```
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
```

**Example 2:**
```
Input: nums = [3,2,4], target = 6
Output: [1,2]
```

**Example 3:**
```
Input: nums = [3,3], target = 6
Output: [0,1]
```

### Constraints:
* `2 <= nums.length <= 10^4`
* `-10^9 <= nums[i] <= 10^9`
* `-10^9 <= target <= 10^9`
* **Only one valid answer exists.**
""",
        "starter_code": {
            "python": "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Write your code here\n        pass\n",
            "cpp": "#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        return {};\n    }\n};\n",
            "java": "import java.util.*;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        return new int[]{};\n    }\n}\n"
        },
        "test_cases": [
            # 5 Open test cases
            {"input": "[2,7,11,15]\n9", "expected": "[0, 1]", "hidden": False},
            {"input": "[3,2,4]\n6", "expected": "[1, 2]", "hidden": False},
            {"input": "[3,3]\n6", "expected": "[0, 1]", "hidden": False},
            {"input": "[-1,-2,-3,-4,-5]\n-8", "expected": "[2, 4]", "hidden": False},
            {"input": "[0,4,3,0]\n0", "expected": "[0, 3]", "hidden": False},
            # 5 Hidden test cases
            {"input": "[1,5,8,12,14]\n20", "expected": "[2, 3]", "hidden": True},
            {"input": "[1000000,-1000000,5]\n0", "expected": "[0, 1]", "hidden": True},
            {"input": "[2,5,5,11]\n10", "expected": "[1, 2]", "hidden": True},
            {"input": "[1,3,4,2]\n6", "expected": "[2, 3]", "hidden": True},
            {"input": "[10,20,30,40,50]\n90", "expected": "[3, 4]", "hidden": True}
        ]
    },
    {
        "id": "longest-substring-without-repeating-characters",
        "title": "Longest Substring Without Repeating Characters",
        "companies": ["Google", "Amazon", "Microsoft", "Meta", "Bloomberg"],
        "difficulty": "Medium",
        "topic": "Sliding Window",
        "description": """### Description
Given a string `s`, find the length of the **longest substring** without duplicate characters.

### Examples

**Example 1:**
```
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.
```

**Example 2:**
```
Input: s = "bbbbb"
Output: 1
Explanation: The answer is "b", with the length of 1.
```

**Example 3:**
```
Input: s = "pwwkew"
Output: 3
Explanation: The answer is "wke", with the length of 3.
Notice that the answer must be a substring, "pwke" is a subsequence and not a substring.
```

### Constraints:
* `0 <= s.length <= 5 * 10^4`
* `s` consists of English letters, digits, symbols and spaces.
""",
        "starter_code": {
            "python": "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        # Write your code here\n        pass\n",
            "cpp": "#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Write your code here\n        return 0;\n    }\n};\n",
            "java": "import java.util.*;\n\nclass Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write your code here\n        return 0;\n    }\n}\n"
        },
        "test_cases": [
            {"input": "\"abcabcbb\"", "expected": "3", "hidden": False},
            {"input": "\"bbbbb\"", "expected": "1", "hidden": False},
            {"input": "\"pwwkew\"", "expected": "3", "hidden": False},
            {"input": "\"\"", "expected": "0", "hidden": False},
            {"input": "\"dvdf\"", "expected": "3", "hidden": False},
            # 5 Hidden test cases
            {"input": "\"tmmzuxt\"", "expected": "5", "hidden": True},
            {"input": "\"abcdefghijklmnopqrstuvwxyz\"", "expected": "26", "hidden": True},
            {"input": "\"aab\"", "expected": "2", "hidden": True},
            {"input": "\"cdd\"", "expected": "2", "hidden": True},
            {"input": "\"abba\"", "expected": "2", "hidden": True}
        ]
    },
    {
        "id": "trapping-rain-water",
        "title": "Trapping Rain Water",
        "companies": ["Google", "Amazon", "Meta", "Goldman Sachs", "Apple"],
        "difficulty": "Hard",
        "topic": "Two Pointers & Monotonic Stack",
        "description": """### Description
Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.

### Examples

**Example 1:**
```
Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]
Output: 6
Explanation: The above elevation map (black section) is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.
```

**Example 2:**
```
Input: height = [4,2,0,3,2,5]
Output: 9
```

### Constraints:
* `n == height.length`
* `1 <= n <= 2 * 10^4`
* `0 <= height[i] <= 10^5`
""",
        "starter_code": {
            "python": "class Solution:\n    def trap(self, height: list[int]) -> int:\n        # Write your code here\n        pass\n",
            "cpp": "#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int trap(vector<int>& height) {\n        // Write your code here\n        return 0;\n    }\n};\n",
            "java": "class Solution {\n    public int trap(int[] height) {\n        // Write your code here\n        return 0;\n    }\n}\n"
        },
        "test_cases": [
            {"input": "[0,1,0,2,1,0,1,3,2,1,2,1]", "expected": "6", "hidden": False},
            {"input": "[4,2,0,3,2,5]", "expected": "9", "hidden": False},
            {"input": "[3,0,2,0,4]", "expected": "7", "hidden": False},
            {"input": "[1,2,3,4,5]", "expected": "0", "hidden": False},
            {"input": "[5,4,3,2,1]", "expected": "0", "hidden": False},
            # Hidden
            {"input": "[0,2,0]", "expected": "0", "hidden": True},
            {"input": "[2,0,2]", "expected": "2", "hidden": True},
            {"input": "[5,1,2,1,5]", "expected": "11", "hidden": True},
            {"input": "[4,2,3]", "expected": "1", "hidden": True},
            {"input": "[6,4,2,0,3,2,0,3,1,4,5,3,2,7,5,3,0,1,2,1,3,4,6,8,1,3]", "expected": "83", "hidden": True}
        ]
    },
    {
        "id": "valid-anagram",
        "title": "Valid Anagram",
        "companies": ["Google", "Amazon", "Uber", "Microsoft", "Salesforce"],
        "difficulty": "Easy",
        "topic": "Strings & Hashing",
        "description": """### Description
Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.

An **Anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.

### Examples

**Example 1:**
```
Input: s = "anagram", t = "nagaram"
Output: true
```

**Example 2:**
```
Input: s = "rat", t = "car"
Output: false
```

### Constraints:
* `1 <= s.length, t.length <= 5 * 10^4`
* `s` and `t` consist of lowercase English letters.
""",
        "starter_code": {
            "python": "class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        # Write your code here\n        pass\n",
            "cpp": "#include <string>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        // Write your code here\n        return false;\n    }\n};\n",
            "java": "class Solution {\n    public boolean isAnagram(String s, String t) {\n        // Write your code here\n        return false;\n    }\n}\n"
        },
        "test_cases": [
            {"input": "\"anagram\"\n\"nagaram\"", "expected": "true", "hidden": False},
            {"input": "\"rat\"\n\"car\"", "expected": "false", "hidden": False},
            {"input": "\"a\"\n\"a\"", "expected": "true", "hidden": False},
            {"input": "\"ab\"\n\"a\"", "expected": "false", "hidden": False},
            {"input": "\"listen\"\n\"silent\"", "expected": "true", "hidden": False},
            # Hidden
            {"input": "\"aacc\"\n\"ccac\"", "expected": "false", "hidden": True},
            {"input": "\"triangle\"\n\"integral\"", "expected": "true", "hidden": True},
            {"input": "\"apple\"\n\"papel\"", "expected": "true", "hidden": True},
            {"input": "\"fluster\"\n\"restful\"", "expected": "true", "hidden": True},
            {"input": "\"abcde\"\n\"abcdf\"", "expected": "false", "hidden": True}
        ]
    },
    {
        "id": "coin-change",
        "title": "Coin Change",
        "companies": ["Amazon", "Microsoft", "Meta", "Google", "Airbnb"],
        "difficulty": "Medium",
        "topic": "Dynamic Programming",
        "description": """### Description
You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.

Return *the fewest number of coins that you need to make up that amount*. If that amount of money cannot be made up by any combination of the coins, return `-1`.

You may assume that you have an infinite number of each kind of coin.

### Examples

**Example 1:**
```
Input: coins = [1,2,5], amount = 11
Output: 3
Explanation: 11 = 5 + 5 + 1
```

**Example 2:**
```
Input: coins = [2], amount = 3
Output: -1
```

**Example 3:**
```
Input: coins = [1], amount = 0
Output: 0
```

### Constraints:
* `1 <= coins.length <= 12`
* `1 <= coins[i] <= 2^31 - 1`
* `0 <= amount <= 10^4`
""",
        "starter_code": {
            "python": "class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        # Write your code here\n        pass\n",
            "cpp": "#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Write your code here\n        return 0;\n    }\n};\n",
            "java": "import java.util.*;\n\nclass Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Write your code here\n        return 0;\n    }\n}\n"
        },
        "test_cases": [
            {"input": "[1,2,5]\n11", "expected": "3", "hidden": False},
            {"input": "[2]\n3", "expected": "-1", "hidden": False},
            {"input": "[1]\n0", "expected": "0", "hidden": False},
            {"input": "[1]\n2", "expected": "2", "hidden": False},
            {"input": "[2,5,10,1]\n27", "expected": "4", "hidden": False},
            # Hidden
            {"input": "[186,419,83,408]\n6249", "expected": "20", "hidden": True},
            {"input": "[1,2,5]\n100", "expected": "20", "hidden": True},
            {"input": "[3,7,405,436]\n8839", "expected": "25", "hidden": True},
            {"input": "[2,4,6,8]\n11", "expected": "-1", "hidden": True},
            {"input": "[411,412,413,414,415,416,417,418,419,420,421,422]\n9864", "expected": "24", "hidden": True}
        ]
    },
    {
        "id": "median-of-two-sorted-arrays",
        "title": "Median of Two Sorted Arrays",
        "companies": ["Google", "Amazon", "Microsoft", "Meta", "Apple"],
        "difficulty": "Hard",
        "topic": "Binary Search",
        "description": """### Description
Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return **the median** of the two sorted arrays.

The overall run time complexity should be `O(log (m+n))`.

### Examples

**Example 1:**
```
Input: nums1 = [1,3], nums2 = [2]
Output: 2.00000
Explanation: merged array = [1,2,3] and median is 2.
```

**Example 2:**
```
Input: nums1 = [1,2], nums2 = [3,4]
Output: 2.50000
Explanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.
```

### Constraints:
* `nums1.length == m`
* `nums2.length == n`
* `0 <= m <= 1000`
* `0 <= n <= 1000`
* `1 <= m + n <= 2000`
* `-10^6 <= nums1[i], nums2[i] <= 10^6`
""",
        "starter_code": {
            "python": "class Solution:\n    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:\n        # Write your code here\n        pass\n",
            "cpp": "#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        // Write your code here\n        return 0.0;\n    }\n};\n",
            "java": "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        // Write your code here\n        return 0.0;\n    }\n}\n"
        },
        "test_cases": [
            {"input": "[1,3]\n[2]", "expected": "2.0", "hidden": False},
            {"input": "[1,2]\n[3,4]", "expected": "2.5", "hidden": False},
            {"input": "[0,0]\n[0,0]", "expected": "0.0", "hidden": False},
            {"input": "[]\n[1]", "expected": "1.0", "hidden": False},
            {"input": "[2]\n[]", "expected": "2.0", "hidden": False},
            # Hidden
            {"input": "[1,2]\n[-1,3]", "expected": "1.5", "hidden": True},
            {"input": "[100001]\n[100000]", "expected": "100000.5", "hidden": True},
            {"input": "[1,2,3,4,5]\n[6,7,8,9,10]", "expected": "5.5", "hidden": True},
            {"input": "[1,3,8,9,15]\n[7,11,18,19,21,25]", "expected": "11.0", "hidden": True},
            {"input": "[2,3,5,8]\n[10,12,14,16,18,20]", "expected": "11.0", "hidden": True}
        ]
    }
]

def get_question_for_company(company: str, difficulty: Optional[str] = None) -> Dict[str, Any]:
    company_lower = (company or "").lower().strip()
    diff_lower = (difficulty or "").lower().strip()
    
    # Filter candidates
    matched = []
    for q in QUESTIONS_DB:
        has_company = any(c.lower() in company_lower or company_lower in c.lower() for c in q["companies"]) if company_lower else True
        has_diff = (q["difficulty"].lower() == diff_lower) if diff_lower and diff_lower != "any" and diff_lower != "brutal" else True
        if has_company and has_diff:
            matched.append(q)
            
    if not matched and diff_lower and diff_lower != "any":
        # Fallback to difficulty match
        matched = [q for q in QUESTIONS_DB if q["difficulty"].lower() == diff_lower]
        
    if not matched:
        # Fallback to any question
        matched = QUESTIONS_DB
        
    selected = random.choice(matched)
    return selected
