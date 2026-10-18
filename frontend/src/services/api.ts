import {
  ChatMessage,
  CodeAnalysis,
  ExecutionReport,
  FinalReport,
  Health,
  InterviewConfig,
  NamedKey,
  PastInterview,
  Question,
  RoundTranscripts,
  RoundType,
} from '../types';

const API_BASE: string =
  (import.meta as any).env?.VITE_API_URL ??
  'http://127.0.0.1:8000/api';

export class ApiError extends Error {}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 90_000
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
    });

    if (!res.ok) {
      let msg = res.statusText || `HTTP ${res.status}`;

      try {
        const body = await res.json();
        msg =
          typeof body.detail === 'string'
            ? body.detail
            : JSON.stringify(body.detail ?? body);
      } catch {
        // Keep default error message.
      }

      throw new ApiError(msg);
    }

    return (await res.json()) as T;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;

    if (e?.name === 'AbortError') {
      throw new ApiError('The request timed out. Try again.');
    }

    throw new ApiError(
      `Cannot reach the backend at ${API_BASE}. Is it running?`
    );
  } finally {
    clearTimeout(timer);
  }
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

export const checkBackendHealth = () =>
  request<Health>('/health', {}, 5000);

// ---------------- API Keys ----------------

export const fetchNamedKeys = () =>
  request<{
    keys: NamedKey[];
    active_key_id: string | null;
  }>('/keys', {}, 10_000);

export const addNamedKey = (
  name: string,
  provider: string,
  api_key: string
) =>
  request<{ status: string }>(
    '/keys',
    post({
      name,
      provider,
      api_key,
      verify: true,
    }),
    30_000
  );

export const verifyApiKey = (
  provider: string,
  api_key: string
) =>
  request<{ valid: boolean; message: string }>(
    '/keys/verify',
    post({
      provider,
      api_key,
    }),
    30_000
  );

export const activateNamedKey = (id: string) =>
  request<{ status: string }>(
    `/keys/${id}/activate`,
    {
      method: 'POST',
    },
    10_000
  );

export const deleteNamedKey = (id: string) =>
  request<{ status: string }>(
    `/keys/${id}`,
    {
      method: 'DELETE',
    },
    10_000
  );

// ---------------- History ----------------

export const fetchInterviewHistory = () =>
  request<PastInterview[]>(
    '/interview/history',
    {},
    10_000
  );

// ---------------- Questions & Code ----------------

export const fetchCompanyQuestion = (
  company: string,
  difficulty: string,
  exclude: string[],
  keyId?: string
) => {
  const params = new URLSearchParams();

  params.set('company', company);
  params.set('difficulty', difficulty);

  if (exclude.length > 0) {
    params.set('exclude', exclude.join(','));
  }

  if (keyId) {
    params.set('key_id', keyId);
  }

  return request<Question>(
    `/questions/company?${params.toString()}`,
    {},
    240_000
  );
};

export const runCode = (p: {
  sessionId: string;
  round: RoundType;
  questionId: string;
  language: string;
  code: string;
  mode: 'run' | 'submit';
}) =>
  request<ExecutionReport>(
    '/code/run',
    post({
      session_id: p.sessionId,
      round: p.round,
      question_id: p.questionId,
      language: p.language,
      code: p.code,
      mode: p.mode,
    }),
    180_000
  );

  // ---------------- Proctoring ----------------

export interface ViolationResponse {
  warnings_count: number;
  terminated: boolean;
  max_warnings: number;
}

export const registerInterviewViolation = (p: {
  sessionId: string;
  violationType: string;
}) =>
  request<ViolationResponse>(
    '/interview/violation',
    post({
      session_id: p.sessionId,
      violation_type: p.violationType,
    }),
    10_000
);

export const analyzeCode = (
  questionId: string,
  code: string,
  language: string,
  execution_results: ExecutionReport,
  keyId?: string
) =>
  request<CodeAnalysis>(
    '/code/analyze',
    post({
      question_id: questionId,
      code,
      language,
      execution_results,
      key_id: keyId,
    }),
    120_000
  );

// ---------------- Resume ----------------

export const parseResumePdf = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);

  return request<{
    raw_text: string;
    detected_skills: string[];
    summary: string;
  }>(
    '/resume/parse-pdf',
    {
      method: 'POST',
      body: fd,
    },
    30_000
  );
};

export const parseResumeText = (text: string) =>
  request<{
    raw_text: string;
    detected_skills: string[];
    summary: string;
  }>(
    '/resume/parse-text',
    post({ text }),
    15_000
  );

// ---------------- Interview Session ----------------

export const startInterviewSession = async (
  c: InterviewConfig
): Promise<string> => {
  const response = await request<{ session_id: string }>(
    '/interview/start',
    post({
      candidate_name: c.candidate_name,
      company: c.company,
      role: c.role,
      difficulty: c.difficulty,
      selected_rounds: c.selected_rounds,
      resume_text: c.resume_text,
      additional_context: c.additional_context,
    }),
    15_000
  );

  return response.session_id;
};

export const sendInterviewChat = async (p: {
  roundType: RoundType;
  company: string;
  role: string;
  messages: ChatMessage[];
  resume: string;
  additionalContext: string;
  keyId?: string;
  extraInstruction?: string;
}): Promise<string> => {
  const response = await request<{ reply: string }>(
    '/interview/chat',
    post({
      round_type: p.roundType,
      company: p.company,
      role: p.role,
      messages: p.messages.map(({ role, content }) => ({
        role,
        content,
      })),
      resume_summary: p.resume,
      additional_context: p.additionalContext,
      key_id: p.keyId,
      extra_instruction: p.extraInstruction ?? '',
    }),
    60_000
  );

  return response.reply;
};

export const finishInterviewSession = async (p: {
  sessionId: string;
  completedRounds: RoundType[];
  transcripts: RoundTranscripts;
  warnings: number;
  keyId?: string;
}): Promise<FinalReport> => {
  const round_transcripts: Record<
    string,
    { role: string; content: string }[]
  > = {};

  for (const [k, v] of Object.entries(p.transcripts)) {
    round_transcripts[k] = (v ?? []).map(
      ({ role, content }) => ({
        role,
        content,
      })
    );
  }

  const response = await request<{ report: FinalReport }>(
    '/interview/finish',
    post({
      session_id: p.sessionId,
      completed_rounds: p.completedRounds,
      round_transcripts,
      warnings_count: p.warnings,
      key_id: p.keyId,
    }),
    180_000
  );

  return response.report;
};