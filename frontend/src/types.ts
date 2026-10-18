export type RoundType = 'dsa_1' | 'dsa_2' | 'technical' | 'hr';

export const ROUND_ORDER: RoundType[] = [
  'dsa_1',
  'dsa_2',
  'technical',
  'hr'
];

export type Provider = 'gemini' | 'openai' | 'groq' | 'anthropic';

export interface NamedKey {
  id: string;
  name: string;
  provider: Provider;
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
  scores: Partial<FinalReport>;
}

export interface Health {
  status: string;
  sandbox: string;
  sandbox_ready: boolean;
  default_key_configured: boolean;
}

export interface InterviewConfig {
  candidate_name: string;
  company: string;
  role: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Brutal';
  selected_rounds: RoundType[];
  resume_text: string;
  detected_skills: string[];
  additional_context: string;
  key_id?: string;
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
  source_url: string;
  starter_code: {
    python: string;
    cpp: string;
    java: string;
  };
  test_cases: TestCase[];
  hidden_count: number;
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

export type RoundTranscripts = Partial<
  Record<RoundType, ChatMessage[]>
>;

export interface DSASubmission {
  questionId: string;
  code: string;
  language: string;
  execReport: ExecutionReport | null;
}

export interface FinalReport {
  overall_score: number;
  hiring_recommendation: string;
  round_breakdowns: Array<{
    round: string;
    score: number;
    feedback: string;
    scored?: boolean;
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