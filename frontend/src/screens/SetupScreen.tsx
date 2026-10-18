import React, { useState } from 'react';
import {
  Building2,
  FileText,
  Key,
  ChevronRight,
  Upload,
  Layers,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { InterviewConfig, RoundType, NamedKey } from '../types';
import { parseResumePdf, parseResumeText } from '../services/api';
import { ParticleCanvas } from '../components/ParticleCanvas';
import { PermissionsCheckModal } from './PermissionsCheckModal';

interface SetupScreenProps {
  initialKey: NamedKey | null;
  onBackToLanding: () => void;
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

export const SetupScreen: React.FC<SetupScreenProps> = ({
  initialKey,
  onBackToLanding,
  onStart
}) => {
  const [candidateName, setCandidateName] = useState("Alex");
  const [dob, setDob] = useState("");
  const [company, setCompany] = useState("Google");
  const [role, setRole] = useState("Software Engineer (SDE I/II)");
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Brutal'>('Medium');
  
  // Rounds Selection
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

  // Additional instructions
  const [additionalContext, setAdditionalContext] = useState(
    "Maintain a realistic technical bar. Ask probing follow-ups on performance bottlenecks and edge cases."
  );

  // Hardware permission modal state
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

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
    setShowPermissionsModal(true);
  };

  const handlePermissionsConfirmed = () => {
    setShowPermissionsModal(false);
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
      provider: initialKey ? initialKey.provider : 'gemini',
      api_key: "",
      key_id: initialKey ? initialKey.id : undefined,
      remember_key: true
    });
  };

  return (
    <div className="relative min-h-screen bg-white text-[#1A1A1A] pb-20 select-text">
      {/* Antigravity background particles */}
      <ParticleCanvas count={90} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-8 space-y-6">
        
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToLanding}
            className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to API Keys & History</span>
          </button>

          <div className="text-xs text-gray-500 font-mono bg-gray-50 border border-gray-200 px-3 py-1 rounded-pill">
            Key: <strong className="text-gray-800">{initialKey ? initialKey.name : "Default Gemini"}</strong>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-medium tracking-tight text-[#1A1A1A]">
            Configure Your Interview Session
          </h1>
          <p className="text-xs text-gray-500">
            Tailor the company question bank, target seniority bar, and rounds to practice.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-card border border-[#E0E0E0] shadow-card p-6 md:p-8 space-y-6">
          
          {/* Section 1: Candidate & Company */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-blue" />
              1. Candidate & Target Company
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                  <span>Date of Birth</span>
                  <span className="text-gray-400 font-normal">Optional</span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  list="companies-list"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  required
                />
                <datalist id="companies-list">
                  {POPULAR_COMPANIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  list="roles-list"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Target Difficulty Bar
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Easy', 'Medium', 'Hard', 'Brutal'] as const).map((diff) => (
                  <button
                    type="button"
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-all text-center ${
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
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-green" />
              2. Rounds to Include (Only selected rounds will be scored)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* DSA Round 1 */}
              <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                selectedRounds.includes('dsa_1')
                  ? "bg-[#EBF3FF] border-[#3186FF]"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="checkbox"
                  checked={selectedRounds.includes('dsa_1')}
                  onChange={() => toggleRound('dsa_1')}
                  className="mt-1 w-4 h-4 text-brand-blue rounded"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">DSA Round 1</span>
                    <span className="text-[10px] bg-brand-blue text-white px-2 py-0.5 rounded-full font-mono">25 mins</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Monaco editor, 10 real test cases (5 open, 5 hidden), and AI approach Q&A.
                  </p>
                </div>
              </label>

              {/* Extra DSA Round 2 */}
              <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                selectedRounds.includes('dsa_2')
                  ? "bg-[#EBF3FF] border-[#3186FF]"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="checkbox"
                  checked={selectedRounds.includes('dsa_2')}
                  onChange={() => toggleRound('dsa_2')}
                  className="mt-1 w-4 h-4 text-brand-blue rounded"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">DSA Round 2 (Optional)</span>
                    <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-mono">25 mins</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    An extra algorithmic coding round with an additional problem.
                  </p>
                </div>
              </label>

              {/* Technical Round */}
              <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                selectedRounds.includes('technical')
                  ? "bg-[#FFF0F0] border-[#FC413D]"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="checkbox"
                  checked={selectedRounds.includes('technical')}
                  onChange={() => toggleRound('technical')}
                  className="mt-1 w-4 h-4 text-brand-red rounded"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">Technical Round</span>
                    <span className="text-[10px] bg-brand-red text-white px-2 py-0.5 rounded-full font-mono">40 mins</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Voice interview probing your projects, architecture, and CS/AI fundamentals.
                  </p>
                </div>
              </label>

              {/* HR Round */}
              <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                selectedRounds.includes('hr')
                  ? "bg-[#EAFAF1] border-[#00B95C]"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="checkbox"
                  checked={selectedRounds.includes('hr')}
                  onChange={() => toggleRound('hr')}
                  className="mt-1 w-4 h-4 text-brand-green rounded"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">HR Round</span>
                    <span className="text-[10px] bg-brand-green text-white px-2 py-0.5 rounded-full font-mono">20 mins</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Behavioral questions, culture fit, and leadership principles (STAR format).
                  </p>
                </div>
              </label>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 3: Resume Parser */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-purple" />
              3. Candidate Resume (PDF or Plain Text)
            </h2>

            <div className="flex flex-col md:flex-row gap-3">
              <label className="flex-1 border-2 border-dashed border-gray-300 hover:border-brand-blue rounded-xl p-5 text-center cursor-pointer transition-colors bg-[#FAFAFA] flex flex-col items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs font-semibold text-gray-700">
                  {resumeFileName || "Upload Resume (PDF / TXT)"}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Click or drag & drop</span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1">
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Or paste resume text here (projects, skills, experience)..."
                  rows={3}
                  className="w-full p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-xs font-mono text-gray-700 leading-relaxed"
                />
              </div>
            </div>

            {detectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center pt-1">
                <span className="text-[11px] text-gray-500 font-medium">Parsed Skills:</span>
                {detectedSkills.map((sk) => (
                  <span
                    key={sk}
                    className="text-[10px] bg-blue-50 text-brand-blue border border-blue-200 px-2 py-0.5 rounded-pill font-medium"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Section 4: Additional Context */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Additional Context for AI Interviewer
            </label>
            <input
              type="text"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g. Keep it strict on edge cases; be encouraging; focus on system design..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Hardware & full-screen check will appear next
            </span>

            <button
              type="submit"
              className="btn-primary text-xs px-6 py-2.5 flex items-center gap-1.5 shadow-sm"
            >
              <span>Next: Hardware & Permissions Check</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Permissions & Camera Check Modal */}
      {showPermissionsModal && (
        <PermissionsCheckModal
          onProceed={handlePermissionsConfirmed}
          onCancel={() => setShowPermissionsModal(false)}
        />
      )}
    </div>
  );
};
