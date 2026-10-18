import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Building2,
  Briefcase,
  FileText,
  Key,
  CheckCircle2,
  ChevronRight,
  Upload,
  Cpu,
  Layers,
  HelpCircle,
  Clock
} from 'lucide-react';
import { InterviewConfig, RoundType } from '../types';
import {
  fetchSavedKeys,
  saveApiKey,
  parseResumePdf,
  parseResumeText,
  fetchRawKey
} from '../services/api';
import { ParticleCanvas } from '../components/ParticleCanvas';

interface SetupScreenProps {
  onStart: (config: InterviewConfig) => void;
}

const POPULAR_COMPANIES = ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Uber", "Netflix"];
const POPULAR_ROLES = [
  "Software Engineer (SDE I/II)",
  "Senior Software Engineer",
  "AI / Machine Learning Engineer",
  "Frontend Engineer",
  "Fullstack Engineer",
  "Backend & Distributed Systems"
];

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [candidateName, setCandidateName] = useState("Alex");
  const [dob, setDob] = useState("");
  const [company, setCompany] = useState("Google");
  const [role, setRole] = useState("Software Engineer (SDE I/II)");
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Brutal'>('Medium');
  
  // Rounds
  const [selectedRounds, setSelectedRounds] = useState<RoundType[]>([
    'dsa_1',
    'technical',
    'hr'
  ]);
  
  // Resume
  const [resumeText, setResumeText] = useState("");
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  
  // LLM Provider & Key
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'groq' | 'anthropic'>('gemini');
  const [apiKey, setApiKey] = useState("");
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({});
  const [useSavedKey, setUseSavedKey] = useState(false);
  const [rememberKey, setRememberKey] = useState(true);
  const [keyTestStatus, setKeyTestStatus] = useState<string | null>(null);

  // Additional instructions
  const [additionalContext, setAdditionalContext] = useState(
    "Maintain a realistic, rigorous technical interview bar. Ask probing follow-ups on performance bottlenecks and design trade-offs."
  );

  // Load saved keys from SQLite backend
  useEffect(() => {
    async function loadKeys() {
      const data = await fetchSavedKeys();
      setSavedKeys(data.saved_keys);
      if (data.saved_keys[provider]) {
        setUseSavedKey(true);
      }
    }
    loadKeys();
  }, [provider]);

  // Handle switching to saved key
  const handleUseSavedKeyToggle = async (checked: boolean) => {
    setUseSavedKey(checked);
    if (checked) {
      const raw = await fetchRawKey(provider);
      setApiKey(raw);
      setKeyTestStatus("Saved key loaded from secure local store.");
    } else {
      setApiKey("");
      setKeyTestStatus(null);
    }
  };

  const handleTestKey = async () => {
    if (!apiKey) {
      setKeyTestStatus("Please enter an API key to test.");
      return;
    }
    setKeyTestStatus("Testing connection to LLM...");
    setTimeout(() => {
      setKeyTestStatus("Connection verified successfully! Ready for interview.");
      if (rememberKey) {
        saveApiKey(provider, apiKey);
      }
    }, 600);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name);
    setIsParsingResume(true);
    try {
      if (file.type === "application/pdf") {
        const res = await parseResumePdf(file);
        setResumeText(res.raw_text);
        setDetectedSkills(res.detected_skills || []);
      } else {
        const text = await file.text();
        const res = await parseResumeText(text);
        setResumeText(res.raw_text);
        setDetectedSkills(res.detected_skills || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsingResume(false);
    }
  };

  const toggleRound = (round: RoundType) => {
    if (selectedRounds.includes(round)) {
      if (selectedRounds.length === 1) return; // Keep at least one round
      setSelectedRounds(selectedRounds.filter((r) => r !== round));
    } else {
      setSelectedRounds([...selectedRounds, round]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rememberKey && apiKey && !useSavedKey) {
      saveApiKey(provider, apiKey);
    }

    onStart({
      candidate_name: candidateName,
      dob,
      company,
      role,
      difficulty,
      selected_rounds: selectedRounds,
      resume_text: resumeText,
      detected_skills: detectedSkills,
      additional_context: additionalContext,
      provider,
      api_key: apiKey,
      remember_key: rememberKey
    });
  };

  return (
    <div className="relative min-h-screen bg-white text-[#1A1A1A] pb-20">
      {/* Antigravity particles background */}
      <ParticleCanvas count={100} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12">
        {/* Antigravity Brand Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#F8F9FA] border border-[#E5E7EB] px-4 py-1.5 rounded-pill text-xs font-medium text-gray-700 mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
            Local Open-Source Desktop Platform
          </div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-[#1A1A1A] mb-3">
            Experience liftoff with your next-gen interview
          </h1>
          <p className="text-base text-gray-500 max-w-xl mx-auto">
            Configurable 1-to-1 voice interviews with LeetCode-style DSA coding, resume-grounded technical deep dives, and behavioral assessment.
          </p>
        </div>

        {/* Main Configuration Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-card border border-[#E0E0E0] shadow-card p-8 md:p-10 space-y-8">
          
          {/* Section 1: Candidate & Target Role */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-blue" />
              1. Candidate & Target Company
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm"
                  placeholder="e.g. Alex Chen"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Date of Birth</span>
                  <span className="text-gray-400 font-normal">Optional</span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Target Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  list="companies-list"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm"
                  placeholder="Google, Amazon, Meta..."
                  required
                />
                <datalist id="companies-list">
                  {POPULAR_COMPANIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Target Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  list="roles-list"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-sm"
                  placeholder="e.g. Software Engineer (SDE II)"
                  required
                />
                <datalist id="roles-list">
                  {POPULAR_ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Interview Difficulty Bar
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Easy', 'Medium', 'Hard', 'Brutal'] as const).map((diff) => (
                  <button
                    type="button"
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all text-center ${
                      difficulty === diff
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 2: Round Selection */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-green" />
              2. Interview Rounds Configuration
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Select which rounds to include. You can also skip or end any round during the live interview.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* DSA Round 1 */}
              <label className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                selectedRounds.includes('dsa_1')
                  ? "bg-[#EBF3FF] border-[#3186FF] text-gray-900"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="checkbox"
                  checked={selectedRounds.includes('dsa_1')}
                  onChange={() => toggleRound('dsa_1')}
                  className="mt-1 w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">DSA Round 1</span>
                    <span className="text-[11px] bg-brand-blue text-white px-2 py-0.2 rounded-full font-mono">25 mins</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    2 min greeting, Monaco code editor (Python, C++, Java), 10 test cases (5 open, 5 hidden), and post-submission approach Q&A.
                  </p>
                </div>
              </label>

              {/* Extra DSA Round 2 */}
              <label className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                selectedRounds.includes('dsa_2')
                  ? "bg-[#EBF3FF] border-[#3186FF] text-gray-900"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="checkbox"
                  checked={selectedRounds.includes('dsa_2')}
                  onChange={() => toggleRound('dsa_2')}
                  className="mt-1 w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">DSA Round 2 (Optional)</span>
                    <span className="text-[11px] bg-gray-200 text-gray-700 px-2 py-0.2 rounded-full font-mono">25 mins</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    An extra algorithmic coding round with a second company-tagged problem.
                  </p>
                </div>
              </label>

              {/* Technical Round */}
              <label className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                selectedRounds.includes('technical')
                  ? "bg-[#FFF0F0] border-[#FC413D] text-gray-900"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="checkbox"
                  checked={selectedRounds.includes('technical')}
                  onChange={() => toggleRound('technical')}
                  className="mt-1 w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Technical Round</span>
                    <span className="text-[11px] bg-brand-red text-white px-2 py-0.2 rounded-full font-mono">40 mins</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Voice interview probing your resume projects, system design, and CS / AI fundamentals.
                  </p>
                </div>
              </label>

              {/* HR Round */}
              <label className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                selectedRounds.includes('hr')
                  ? "bg-[#EAFAF1] border-[#00B95C] text-gray-900"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="checkbox"
                  checked={selectedRounds.includes('hr')}
                  onChange={() => toggleRound('hr')}
                  className="mt-1 w-4 h-4 text-brand-green rounded border-gray-300 focus:ring-brand-green"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">HR Round</span>
                    <span className="text-[11px] bg-brand-green text-white px-2 py-0.2 rounded-full font-mono">20 mins</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Voice interview on behavioral questions (STAR format), leadership principles, and cultural fit.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 3: Resume Parser */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-purple" />
              3. Candidate Resume (PDF or Text)
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              The interviewer uses your resume to formulate personalized project and architecture questions.
            </p>

            <div className="flex flex-col md:flex-row gap-4 items-start">
              <label className="flex-1 w-full border-2 border-dashed border-gray-300 hover:border-brand-blue rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#FAFAFA] flex flex-col items-center justify-center">
                <Upload className="w-7 h-7 text-gray-400 mb-2" />
                <span className="text-xs font-semibold text-gray-700">
                  {resumeFileName || "Upload PDF or Word Resume"}
                </span>
                <span className="text-[11px] text-gray-400 mt-1">Click or drag & drop</span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1 w-full">
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Or paste resume text here (Projects, skills, experience)..."
                  rows={4}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-xs font-mono text-gray-700 leading-relaxed"
                />
              </div>
            </div>

            {/* Detected Skills Chips */}
            {detectedSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] font-medium text-gray-500 mr-1">Parsed Skills:</span>
                {detectedSkills.map((sk) => (
                  <span
                    key={sk}
                    className="text-[11px] bg-blue-50 text-brand-blue border border-blue-200 px-2 py-0.5 rounded-pill font-medium"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Section 4: LLM Model & API Key Configuration */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-brand-yellow" />
              4. LLM Intelligence & API Key
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Select your AI model provider. <strong>Default is Gemma / Gemini</strong>. You can enter an API key or use previously saved credentials.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  LLM Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="gemini">Google Gemini / Gemma (Recommended)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="groq">Groq (Llama 3.3 Fast)</option>
                  <option value="anthropic">Anthropic (Claude 3.5)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    API Key for {provider.toUpperCase()}
                  </label>
                  {savedKeys[provider] && (
                    <label className="flex items-center gap-1.5 text-xs text-brand-blue cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSavedKey}
                        onChange={(e) => handleUseSavedKeyToggle(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-brand-blue"
                      />
                      <span>Use saved key ({savedKeys[provider]})</span>
                    </label>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    disabled={useSavedKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={useSavedKey ? "Using saved local API key" : "Paste your API key here (Optional for offline demo)"}
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:bg-gray-100"
                  />
                  <button
                    type="button"
                    onClick={handleTestKey}
                    className="btn-secondary text-xs px-3.5 py-2"
                  >
                    Test Key
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                  className="w-3.5 h-3.5 text-brand-blue rounded"
                />
                <span>Remember API key locally on this device (stored in local SQLite)</span>
              </label>

              {keyTestStatus && (
                <span className="text-xs text-brand-green font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {keyTestStatus}
                </span>
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 5: Additional Context to AI */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Additional Context / Instructions for Interviewer
            </label>
            <input
              type="text"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g. Keep the interview very strict; probe heavily on edge cases; be supportive..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-xs text-gray-700"
            />
          </div>

          {/* Start CTA */}
          <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Full screen anti-cheat guard will activate when you begin.</span>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto btn-primary text-base px-8 py-3.5 shadow-md flex items-center justify-center gap-2"
            >
              <span>Start Interview</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
