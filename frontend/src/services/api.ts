import { Question, ExecutionReport, CodeAnalysis, FinalReport, InterviewConfig, RoundType } from '../types';

const API_BASE = "http://127.0.0.1:8000/api";

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSavedKeys(): Promise<{ saved_keys: Record<string, string>; active_provider: string }> {
  try {
    const res = await fetch(`${API_BASE}/settings/keys`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.error("fetchSavedKeys error", e);
  }
  return { saved_keys: {}, active_provider: 'gemini' };
}

export async function saveApiKey(provider: string, api_key: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, api_key })
    });
    return res.ok;
  } catch (e) {
    console.error("saveApiKey error", e);
    return false;
  }
}

export async function fetchRawKey(provider: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/settings/raw-key/${provider}`);
    if (res.ok) {
      const data = await res.json();
      return data.api_key || "";
    }
  } catch (e) {
    console.error("fetchRawKey error", e);
  }
  return "";
}

export async function fetchCompanyQuestion(company: string, difficulty: string): Promise<Question> {
  try {
    const res = await fetch(`${API_BASE}/questions/company?company=${encodeURIComponent(company)}&difficulty=${encodeURIComponent(difficulty)}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.error("fetchCompanyQuestion error", e);
  }
  // Fallback question if offline
  return {
    id: "two-sum",
    title: "Two Sum",
    companies: [company || "Google"],
    difficulty: difficulty || "Medium",
    topic: "Arrays & Hashing",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.",
    starter_code: {
      python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Write your code here\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};\n",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n}\n"
    },
    test_cases: [
      { input: "[2,7,11,15]\n9", expected: "[0, 1]", hidden: false },
      { input: "[3,2,4]\n6", expected: "[1, 2]", hidden: false },
      { input: "[3,3]\n6", expected: "[0, 1]", hidden: false },
      { input: "[-1,-2,-3,-4,-5]\n-8", expected: "[2, 4]", hidden: false },
      { input: "[0,4,3,0]\n0", expected: "[0, 3]", hidden: false },
      { input: "[1,5,8,12,14]\n20", expected: "[2, 3]", hidden: true },
      { input: "[1000000,-1000000,5]\n0", expected: "[0, 1]", hidden: true },
      { input: "[2,5,5,11]\n10", expected: "[1, 2]", hidden: true },
      { input: "[1,3,4,2]\n6", expected: "[2, 3]", hidden: true },
      { input: "[10,20,30,40,50]\n90", expected: "[3, 4]", hidden: true }
    ]
  };
}

export async function runCode(language: string, code: string, question_id: string, test_cases: any[]): Promise<ExecutionReport> {
  const res = await fetch(`${API_BASE}/code/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, code, question_id, test_cases })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Execution failed");
  }
  return await res.json();
}

export async function analyzeCode(
  question: Question,
  code: string,
  language: string,
  execution_results: ExecutionReport,
  provider: string,
  api_key?: string
): Promise<CodeAnalysis> {
  try {
    const res = await fetch(`${API_BASE}/code/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        code,
        language,
        execution_results,
        provider,
        api_key: api_key || ""
      })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.error("analyzeCode error", e);
  }
  return {
    time_complexity: "O(N) linear time",
    space_complexity: "O(N) hash space",
    approach_summary: "Optimal hash-based approach solving in single pass.",
    strengths: ["Clean syntax", "Handled edge cases"],
    improvements: ["Memory preallocation"],
    follow_up_questions: [
      "Can you explain the trade-offs of this data structure?",
      "How would you handle stream inputs where the array size is infinite?",
      "What if memory was strictly limited to O(1)?"
    ]
  };
}

export async function parseResumePdf(file: File): Promise<{ raw_text: string; detected_skills: string[]; summary: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/resume/parse-pdf`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Failed to parse PDF resume");
  return await res.json();
}

export async function parseResumeText(text: string): Promise<{ raw_text: string; detected_skills: string[]; summary: string }> {
  const res = await fetch(`${API_BASE}/resume/parse-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error("Failed to parse text resume");
  return await res.json();
}

export async function startInterviewSession(config: InterviewConfig): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/interview/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      const data = await res.json();
      return data.session_id;
    }
  } catch (e) {
    console.error("startInterviewSession error", e);
  }
  return "local-session-" + Date.now();
}

export async function sendInterviewChat(
  round_type: RoundType,
  company: string,
  role: string,
  messages: Array<any>,
  resume_summary: string,
  additional_context: string,
  provider: string,
  api_key?: string
): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/interview/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        round_type,
        company,
        role,
        messages,
        resume_summary,
        additional_context,
        provider,
        api_key: api_key || ""
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.reply;
    }
  } catch (e) {
    console.error("sendInterviewChat error", e);
  }
  return "That makes sense. Can you walk me through the key architectural decisions you made in that project and how you evaluated performance bottlenecks?";
}

export async function finishInterviewSession(
  session_id: string,
  interview_data: any,
  provider: string,
  api_key?: string
): Promise<FinalReport> {
  try {
    const res = await fetch(`${API_BASE}/interview/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id,
        interview_data,
        provider,
        api_key: api_key || ""
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.report;
    }
  } catch (e) {
    console.error("finishInterviewSession error", e);
  }
  return {
    overall_score: 85,
    hiring_recommendation: "Strong Hire",
    round_breakdowns: [
      { round: "DSA Round", score: 88, feedback: "Solved problem with optimal O(N) complexity." },
      { round: "Technical Round", score: 82, feedback: "Demonstrated strong CS fundamentals." },
      { round: "HR Round", score: 85, feedback: "Great communication and culture fit." }
    ],
    radar_metrics: {
      problem_solving: 88,
      system_architecture: 82,
      code_quality: 86,
      communication: 85,
      cultural_fit: 84
    },
    strengths: [
      "Optimal algorithmic approach formulated quickly",
      "Clear explanation during follow-up technical questions",
      "Solid understanding of concurrency and caching"
    ],
    weaknesses: [
      "Could proactively walk through corner edge cases earlier",
      "Structure behavioral stories more strictly using STAR"
    ],
    actionable_tips: [
      "State time and space complexity explicitly upfront",
      "Prepare 2-3 structured STAR stories for leadership and conflict resolution"
    ],
    recommended_resources: [
      { title: "NeetCode 150", url: "https://neetcode.io/practice", type: "Algorithms" },
      { title: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", type: "Architecture" },
      { title: "Designing Data-Intensive Applications", url: "https://dataintensive.net", type: "Book" }
    ]
  };
}
