export type RoundType = 'dsa_1' | 'dsa_2' | 'technical' | 'hr';

export interface NamedKey {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'groq' | 'anthropic';
  masked_key: string;
  is_active: boolean;
  created_at: string;
}

export interface PastInterview {
  id: string;
  created_at: string;
  company: string;
  role: string;
  difficulty: string;
  candidate_name: string;
  status: string;
  scores: any;
}

export interface InterviewConfig {
  candidate_name: string;
  dob: string;
  company: string;
  role: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Brutal';
  selected_rounds: RoundType[];
  resume_text: string;
  detected_skills: string[];
  additional_context: string;
  provider: 'gemini' | 'openai' | 'groq' | 'anthropic';
  api_key: string;
  key_id?: string;
  remember_key: boolean;
}

export interface TestCase {
  input: string;
  expected: string;
  hidden: boolean;
}

export interface Question {
  id: string;
  title: string;
  companies: string[];
  difficulty: string;
  topic: string;
  description: string;
  starter_code: {
    python: string;
    cpp: string;
    java: string;
  };
  test_cases: TestCase[];
}

export interface TestCaseResult {
  test_index: number;
  hidden: boolean;
  input: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  execution_time_ms: number;
  error: string | null;
}

export interface ExecutionReport {
  language: string;
  all_passed: boolean;
  total_cases: number;
  passed_cases: number;
  results: TestCaseResult[];
  compilation_error?: string;
}

export interface CodeAnalysis {
  time_complexity: string;
  space_complexity: string;
  approach_summary: string;
  strengths: string[];
  improvements: string[];
  follow_up_questions: string[];
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}

export interface FinalReport {
  overall_score: number;
  hiring_recommendation: string;
  round_breakdowns: Array<{
    round: string;
    score: number;
    feedback: string;
  }>;
  radar_metrics: {
    problem_solving: number;
    system_architecture: number;
    code_quality: number;
    communication: number;
    cultural_fit: number;
  };
  strengths: string[];
  weaknesses: string[];
  actionable_tips: string[];
  recommended_resources: Array<{
    title: string;
    url: string;
    type: string;
  }>;
}

export interface SavedResume {
  id: string;
  title: string;
  candidate_name: string;
  file_name: string;
  raw_text: string;
  detected_skills: string[];
  is_active: boolean;
  created_at: string;
}

export interface SavedCredentials {
  candidate_name: string;
  dob?: string;
  company: string;
  role: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Brutal';
  selected_rounds: RoundType[];
  additional_context: string;
  active_resume_id?: string;
  resume_text?: string;
}

