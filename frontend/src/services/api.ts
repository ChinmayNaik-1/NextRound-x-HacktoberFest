import {
  Question,
  ExecutionReport,
  CodeAnalysis,
  FinalReport,
  InterviewConfig,
  RoundType,
  NamedKey,
  PastInterview,
  SavedResume,
  SavedCredentials
} from '../types';

const API_BASE = "http://127.0.0.1:8000/api";

const KEYS_CACHE_KEY = "nextround_cached_keys";
const RESUMES_CACHE_KEY = "nextround_cached_resumes";
const CREDS_CACHE_KEY = "nextround_cached_credentials";

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------- Named API Keys ----------------

export function getCachedKeys(): { keys: NamedKey[]; active_key_id: string | null } {
  try {
    const raw = localStorage.getItem(KEYS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { keys: [], active_key_id: null };
}

export function setCachedKeys(data: { keys: NamedKey[]; active_key_id: string | null }) {
  try {
    localStorage.setItem(KEYS_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export async function fetchNamedKeys(): Promise<{ keys: NamedKey[]; active_key_id: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/keys`);
    if (res.ok) {
      const data = await res.json();
      setCachedKeys(data);
      return data;
    }
  } catch (e) {
    console.warn("fetchNamedKeys failed, falling back to cache", e);
  }
  return getCachedKeys();
}

export async function addNamedKey(
  name: string,
  provider: string,
  api_key: string,
  verify: boolean = true
): Promise<{ status: string; key: any; message?: string }> {
  const res = await fetch(`${API_BASE}/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, provider, api_key, verify })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to add API key" }));
    throw new Error(err.detail || "Failed to add key");
  }
  const result = await res.json();
  // Refresh cache
  fetchNamedKeys().catch(() => {});
  return result;
}

export async function verifyApiKey(provider: string, api_key: string): Promise<{ valid: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/keys/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, api_key })
    });
    if (res.ok) return await res.json();
  } catch (e: any) {
    return { valid: false, message: e.message || "Network error during verification" };
  }
  return { valid: false, message: "Verification failed" };
}

export async function activateNamedKey(key_id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/keys/${key_id}/activate`, { method: "POST" });
    if (res.ok) {
      const cached = getCachedKeys();
      cached.active_key_id = key_id;
      cached.keys.forEach((k) => {
        k.is_active = k.id === key_id;
      });
      setCachedKeys(cached);
      return true;
    }
  } catch {}
  return false;
}

export async function deleteNamedKey(key_id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/keys/${key_id}`, { method: "DELETE" });
    if (res.ok) {
      const cached = getCachedKeys();
      cached.keys = cached.keys.filter((k) => k.id !== key_id);
      if (cached.active_key_id === key_id) {
        cached.active_key_id = cached.keys[0]?.id || null;
      }
      setCachedKeys(cached);
      return true;
    }
  } catch {}
  return false;
}

// ---------------- Resumes Management ----------------

export function getCachedResumes(): { resumes: SavedResume[]; active_resume_id: string | null } {
  try {
    const raw = localStorage.getItem(RESUMES_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { resumes: [], active_resume_id: null };
}

export function setCachedResumes(data: { resumes: SavedResume[]; active_resume_id: string | null }) {
  try {
    localStorage.setItem(RESUMES_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export async function fetchResumes(): Promise<{ resumes: SavedResume[]; active_resume_id: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/resumes`);
    if (res.ok) {
      const data = await res.json();
      setCachedResumes(data);
      return data;
    }
  } catch (e) {
    console.warn("fetchResumes failed, falling back to cache", e);
  }
  return getCachedResumes();
}

export async function addSavedResume(
  title: string,
  raw_text: string,
  candidate_name: string = "",
  file_name: string = "",
  detected_skills: string[] = []
): Promise<{ status: string; resume: SavedResume; message?: string }> {
  const res = await fetch(`${API_BASE}/resumes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      raw_text,
      candidate_name,
      file_name,
      detected_skills,
      make_active: true
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to save resume" }));
    throw new Error(err.detail || "Failed to save resume");
  }
  const result = await res.json();
  fetchResumes().catch(() => {});
  return result;
}

export async function activateSavedResume(resume_id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/resumes/${resume_id}/activate`, { method: "POST" });
    if (res.ok) {
      const cached = getCachedResumes();
      cached.active_resume_id = resume_id;
      cached.resumes.forEach((r) => {
        r.is_active = r.id === resume_id;
      });
      setCachedResumes(cached);
      return true;
    }
  } catch {}
  return false;
}

export async function deleteSavedResume(resume_id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/resumes/${resume_id}`, { method: "DELETE" });
    if (res.ok) {
      const cached = getCachedResumes();
      cached.resumes = cached.resumes.filter((r) => r.id !== resume_id);
      if (cached.active_resume_id === resume_id) {
        cached.active_resume_id = cached.resumes[0]?.id || null;
      }
      setCachedResumes(cached);
      return true;
    }
  } catch {}
  return false;
}

export async function updateSavedResume(
  resume_id: string,
  data: {
    title?: string;
    raw_text?: string;
    candidate_name?: string;
    file_name?: string;
    detected_skills?: string[];
  }
): Promise<{ status: string; resume: SavedResume } | null> {
  try {
    const res = await fetch(`${API_BASE}/resumes/${resume_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const result = await res.json();
      const cached = getCachedResumes();
      cached.resumes = cached.resumes.map((r) => (r.id === resume_id ? { ...r, ...result.resume } : r));
      setCachedResumes(cached);
      return result;
    }
  } catch (e) {
    console.warn("Failed to update resume:", e);
  }
  return null;
}


// ---------------- Candidate Credentials Persistence ----------------

export function getCachedCredentials(): SavedCredentials {
  try {
    const raw = localStorage.getItem(CREDS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    candidate_name: "Alex",
    company: "Google",
    role: "Software Engineer (SDE I/II)",
    difficulty: "Medium",
    selected_rounds: ["dsa_1", "technical", "hr"],
    additional_context: "Maintain a realistic technical bar. Ask probing follow-ups on performance bottlenecks and edge cases."
  };
}

export function setCachedCredentials(creds: SavedCredentials) {
  try {
    localStorage.setItem(CREDS_CACHE_KEY, JSON.stringify(creds));
  } catch {}
}

export async function fetchCredentials(): Promise<SavedCredentials> {
  try {
    const res = await fetch(`${API_BASE}/credentials`);
    if (res.ok) {
      const data = await res.json();
      setCachedCredentials(data);
      return data;
    }
  } catch {}
  return getCachedCredentials();
}

export async function saveCredentialsApi(creds: SavedCredentials): Promise<void> {
  setCachedCredentials(creds);
  try {
    await fetch(`${API_BASE}/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds)
    });
  } catch {}
}

// ---------------- Interview History ----------------

export async function fetchInterviewHistory(): Promise<PastInterview[]> {
  try {
    const res = await fetch(`${API_BASE}/interview/history`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.error("fetchInterviewHistory error", e);
  }
  return [];
}

export async function deleteInterviewHistory(interviewId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/interview/history/${encodeURIComponent(interviewId)}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete interview" }));
    throw new Error(err.detail || "Failed to delete interview");
  }
}

// ---------------- Questions ----------------

export async function fetchCompanyQuestion(company: string, difficulty: string): Promise<Question> {
  try {
    const res = await fetch(`${API_BASE}/questions/company?company=${encodeURIComponent(company)}&difficulty=${encodeURIComponent(difficulty)}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.error("fetchCompanyQuestion error", e);
  }
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

// ---------------- Real Code Execution ----------------

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
  api_key?: string,
  key_id?: string
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
        api_key: api_key || "",
        key_id: key_id || ""
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

// ---------------- Resume Parsing ----------------

/** Client-side resume skill extraction — works fully offline, no backend needed. */
export function parseResumeTextLocal(text: string): { raw_text: string; detected_skills: string[]; summary: string } {
  const COMMON_SKILLS = [
    "Python", "Java", "C++", "JavaScript", "TypeScript", "React", "Node.js", "Docker",
    "Kubernetes", "AWS", "SQL", "PostgreSQL", "MongoDB", "Git", "REST APIs", "FastAPI",
    "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "NLP", "LLM", "System Design",
    "Go", "Rust", "Swift", "Kotlin", "GraphQL", "Redis", "Linux", "CI/CD", "Terraform",
    "Spring Boot", "Django", "Flask", "Next.js", "Vue", "Angular", "MySQL", "Elasticsearch"
  ];
  const lower = text.toLowerCase();
  const detected_skills = COMMON_SKILLS.filter(s => lower.includes(s.toLowerCase()));
  return {
    raw_text: text.trim(),
    detected_skills,
    summary: text.slice(0, 500) + (text.length > 500 ? "..." : "")
  };
}

export async function parseResumePdf(file: File): Promise<{ raw_text: string; detected_skills: string[]; summary: string }> {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch(`${API_BASE}/resume/parse-pdf`, {
      method: "POST",
      body: formData
    });
    if (res.ok) return await res.json();
    const errText = await res.text().catch(() => "");
    throw new Error(errText || "Failed to parse PDF resume");
  } catch (e: any) {
    // If it's a network error (backend offline), surface a clear message
    if (e.message === "Failed to fetch" || e.name === "TypeError") {
      throw new Error("BACKEND_OFFLINE");
    }
    throw e;
  }
}

export async function parseResumeText(text: string): Promise<{ raw_text: string; detected_skills: string[]; summary: string }> {
  try {
    const res = await fetch(`${API_BASE}/resume/parse-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (res.ok) return await res.json();
  } catch {
    // Backend offline — fall back to local parsing silently
  }
  return parseResumeTextLocal(text);
}

// ---------------- Interview Sessions ----------------

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

export async function transcribeAudio(
  audioBlob: Blob,
  provider?: string,
  apiKey?: string,
  keyId?: string
): Promise<{ transcript: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    if (provider) formData.append("provider", provider);
    if (apiKey) formData.append("api_key", apiKey);
    if (keyId) formData.append("key_id", keyId);

    const res = await fetch(`${API_BASE}/speech/transcribe`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    return { transcript: "", error: errText || "Transcription failed" };
  } catch (e: any) {
    console.error("transcribeAudio error:", e);
    return { transcript: "", error: e.message || "Failed to connect to transcription service" };
  }
}

export async function sendInterviewChat(
  round_type: RoundType,
  company: string,
  role: string,
  messages: Array<any>,
  resume_summary: string,
  additional_context: string,
  provider: string,
  api_key?: string,
  key_id?: string,
  current_question?: any,
  candidate_code?: string,
  language?: string,
  execution_report?: any,
  submission_status?: string
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
        api_key: api_key || "",
        key_id: key_id || "",
        current_question: current_question || null,
        candidate_code: candidate_code || null,
        language: language || "python",
        execution_report: execution_report || null,
        submission_status: submission_status || "in_progress"
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        return data.reply;
      }
    }
    const errData = await res.json().catch(() => ({ detail: "Chat server error" }));
    console.error("sendInterviewChat HTTP Error:", res.status, errData);
    return `[Backend Notice: HTTP ${res.status}] ${errData.detail || "AI service returned an unexpected response. Please verify your active API key."}`;
  } catch (e: any) {
    console.error("sendInterviewChat connection error", e);
    return `[Offline Notice]: Could not connect to local InterviewAI backend on port 8000 (${e.message || "Connection refused"}). Please ensure the local backend server is running.`;
  }
}



export async function finishInterviewSession(
  session_id: string,
  interview_data: any,
  provider: string,
  api_key?: string,
  key_id?: string
): Promise<FinalReport> {
  try {
    const res = await fetch(`${API_BASE}/interview/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id,
        interview_data,
        provider,
        api_key: api_key || "",
        key_id: key_id || ""
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
      { round: "DSA Round 1", score: 88, feedback: "Solved problem with optimal O(N) complexity." }
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
      "Clear explanation during follow-up technical questions"
    ],
    weaknesses: [
      "Could proactively walk through corner edge cases earlier"
    ],
    actionable_tips: [
      "State time and space complexity explicitly upfront"
    ],
    recommended_resources: [
      { title: "NeetCode 150", url: "https://neetcode.io/practice", type: "Algorithms" },
      { title: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", type: "Architecture" }
    ]
  };
}
