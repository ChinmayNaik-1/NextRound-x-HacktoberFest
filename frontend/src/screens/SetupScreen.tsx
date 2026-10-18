import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  Key,
  ChevronRight,
  Upload,
  Layers,
  Clock,
  ArrowLeft,
  Bookmark,
  Check,
  Trash2,
  Sparkles,
  Plus,
  Save,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { InterviewConfig, RoundType, NamedKey, SavedResume, SavedCredentials } from '../types';
import {
  parseResumePdf,
  parseResumeText,
  fetchResumes,
  addSavedResume,
  updateSavedResume,
  activateSavedResume,
  deleteSavedResume,
  getCachedResumes,
  getCachedCredentials,
  getCachedKeys,
  fetchCredentials,
  saveCredentialsApi
} from '../services/api';

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
  const cachedCreds = getCachedCredentials();
  const [candidateName, setCandidateName] = useState(cachedCreds.candidate_name || "Alex");
  const [dob, setDob] = useState(cachedCreds.dob || "");
  const [company, setCompany] = useState(cachedCreds.company || "Google");
  const [role, setRole] = useState(cachedCreds.role || "Software Engineer (SDE I/II)");
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Brutal'>(cachedCreds.difficulty || 'Medium');
  
  // Rounds Selection
  const [selectedRounds, setSelectedRounds] = useState<RoundType[]>(
    cachedCreds.selected_rounds && cachedCreds.selected_rounds.length > 0
      ? cachedCreds.selected_rounds
      : ['dsa_1', 'technical', 'hr']
  );
  
  // Resumes list & selection
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("new");
  const [newResumeTitle, setNewResumeTitle] = useState("");
  const [resumeText, setResumeText] = useState(cachedCreds.resume_text || "");
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Additional instructions
  const [additionalContext, setAdditionalContext] = useState(
    cachedCreds.additional_context ||
    "Maintain a realistic technical bar. Ask probing follow-ups on performance bottlenecks and edge cases."
  );

  // Hardware permission modal state
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Sync candidate profile state to local storage and backend
  const syncProfile = (overrides?: Partial<SavedCredentials>) => {
    saveCredentialsApi({
      candidate_name: overrides?.candidate_name ?? candidateName,
      dob: overrides?.dob ?? dob,
      company: overrides?.company ?? company,
      role: overrides?.role ?? role,
      difficulty: overrides?.difficulty ?? difficulty,
      selected_rounds: overrides?.selected_rounds ?? selectedRounds,
      additional_context: overrides?.additional_context ?? additionalContext,
      active_resume_id: overrides?.active_resume_id ?? (selectedResumeId !== "new" ? selectedResumeId : undefined),
      resume_text: overrides?.resume_text ?? resumeText
    });
  };

  // Load Credentials & Saved Resumes on mount
  useEffect(() => {
    // 1. Instant cache load
    const cachedR = getCachedResumes();
    if (cachedR.resumes.length > 0) {
      setSavedResumes(cachedR.resumes);
      const targetId = cachedCreds.active_resume_id || cachedR.active_resume_id;
      const active = cachedR.resumes.find((r) => r.id === targetId) || cachedR.resumes.find((r) => r.is_active) || cachedR.resumes[0];
      if (active) {
        setSelectedResumeId(active.id);
        setResumeText(active.raw_text);
        setDetectedSkills(active.detected_skills || []);
        setResumeFileName(active.file_name || active.title);
        if (active.candidate_name && (!cachedCreds.candidate_name || cachedCreds.candidate_name === "Alex")) {
          setCandidateName(active.candidate_name);
        }
      }
    }

    // 2. Refresh from backend
    Promise.all([fetchCredentials(), fetchResumes()]).then(([creds, resumesData]) => {
      if (creds) {
        if (creds.candidate_name) setCandidateName(creds.candidate_name);
        if (creds.dob) setDob(creds.dob);
        if (creds.company) setCompany(creds.company);
        if (creds.role) setRole(creds.role);
        if (creds.difficulty) setDifficulty(creds.difficulty);
        if (creds.selected_rounds && creds.selected_rounds.length > 0) {
          setSelectedRounds(creds.selected_rounds);
        }
        if (creds.additional_context) setAdditionalContext(creds.additional_context);
      }

      if (resumesData && resumesData.resumes.length > 0) {
        setSavedResumes(resumesData.resumes);
        const targetId = creds?.active_resume_id || resumesData.active_resume_id;
        const active = resumesData.resumes.find((r) => r.id === targetId) || resumesData.resumes.find(r => r.is_active) || resumesData.resumes[0];
        if (active) {
          setSelectedResumeId(active.id);
          setResumeText(active.raw_text);
          setDetectedSkills(active.detected_skills || []);
          setResumeFileName(active.file_name || active.title);
          if (active.candidate_name && (!creds?.candidate_name || creds.candidate_name === "Alex")) {
            setCandidateName(active.candidate_name);
          }
        }
      }
    });
  }, []);

  const handleSelectResume = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedResumeId(id);
    if (id === "new") {
      setResumeText("");
      setDetectedSkills([]);
      setResumeFileName("");
      setNewResumeTitle("");
      syncProfile({ active_resume_id: "", resume_text: "" });
      return;
    }
    const found = savedResumes.find((r) => r.id === id);
    if (found) {
      setResumeText(found.raw_text);
      setDetectedSkills(found.detected_skills || []);
      setResumeFileName(found.file_name || found.title);
      if (found.candidate_name && (!candidateName || candidateName === "Alex")) {
        setCandidateName(found.candidate_name);
      }
      await activateSavedResume(found.id);
      syncProfile({
        candidate_name: found.candidate_name || candidateName,
        active_resume_id: found.id,
        resume_text: found.raw_text
      });
      setNotification({ type: 'success', text: `Loaded saved resume: "${found.title}"` });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSaveCurrentResume = async () => {
    if (!resumeText.trim()) {
      alert("Please upload or paste a resume first before saving.");
      return;
    }
    const title = newResumeTitle.trim() || resumeFileName || `${candidateName}'s Resume`;
    setIsSavingResume(true);
    try {
      const res = await addSavedResume(title, resumeText, candidateName, resumeFileName, detectedSkills);
      const updated = await fetchResumes();
      setSavedResumes(updated.resumes);
      setSelectedResumeId(res.resume.id);
      setNewResumeTitle("");
      syncProfile({ active_resume_id: res.resume.id, resume_text: resumeText });
      setNotification({ type: 'success', text: `Resume "${title}" saved to your profiles!` });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save resume");
    } finally {
      setIsSavingResume(false);
    }
  };

  const handleUpdateCurrentResume = async () => {
    if (!resumeText.trim()) {
      alert("Resume text cannot be empty.");
      return;
    }
    if (selectedResumeId === "new") {
      handleSaveCurrentResume();
      return;
    }
    setIsSavingResume(true);
    try {
      const current = savedResumes.find((r) => r.id === selectedResumeId);
      const title = newResumeTitle.trim() || current?.title || `${candidateName}'s Resume`;
      await updateSavedResume(selectedResumeId, {
        title,
        raw_text: resumeText,
        candidate_name: candidateName,
        file_name: resumeFileName || current?.file_name,
        detected_skills: detectedSkills
      });
      const updated = await fetchResumes();
      setSavedResumes(updated.resumes);
      syncProfile({ active_resume_id: selectedResumeId, resume_text: resumeText });
      setNotification({ type: 'success', text: `Resume "${title}" updated successfully!` });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update resume");
    } finally {
      setIsSavingResume(false);
    }
  };

  const handleDeleteResume = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Delete this saved resume profile?")) {
      await deleteSavedResume(id);
      const updated = await fetchResumes();
      setSavedResumes(updated.resumes);
      if (updated.resumes.length > 0) {
        const next = updated.resumes[0];
        setSelectedResumeId(next.id);
        setResumeText(next.raw_text);
        setDetectedSkills(next.detected_skills || []);
        setResumeFileName(next.file_name || next.title);
        syncProfile({ active_resume_id: next.id, resume_text: next.raw_text });
      } else {
        setSelectedResumeId("new");
        setResumeText("");
        setDetectedSkills([]);
        setResumeFileName("");
        syncProfile({ active_resume_id: "", resume_text: "" });
      }
      setNotification({ type: 'info', text: "Resume profile deleted." });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const baseTitle = file.name.replace(/\.[^/.]+$/, "");
    setResumeFileName(file.name);
    setNewResumeTitle(baseTitle);
    setIsParsingResume(true);
    setNotification(null);
    try {
      let rawText = "";
      let skills: string[] = [];

      if (file.type === "application/pdf") {
        // PDF parsing requires the backend — handle gracefully if offline
        try {
          const res = await parseResumePdf(file);
          rawText = res.raw_text;
          skills = res.detected_skills || [];
        } catch (pdfErr: any) {
          if (pdfErr.message === "BACKEND_OFFLINE") {
            setNotification({
              type: 'info',
              text: "⚠️ Backend is starting up — PDF parsing needs it. Try again in a moment, or paste your resume text instead."
            });
          } else {
            setNotification({ type: 'info', text: `Could not parse PDF: ${pdfErr.message}. Please paste your resume text instead.` });
          }
          setIsParsingResume(false);
          return;
        }
      } else {
        // TXT / plain-text: parse on the frontend, backend called for richer extraction but falls back offline
        const text = await file.text();
        const res = await parseResumeText(text);
        rawText = res.raw_text;
        skills = res.detected_skills || [];
      }

      setResumeText(rawText);
      setDetectedSkills(skills);

      // Automatically persist to database so candidate never has to re-upload
      if (rawText.trim()) {
        const titleToSave = baseTitle || `${candidateName || 'Candidate'}'s Resume`;
        try {
          const saveRes = await addSavedResume(titleToSave, rawText, candidateName, file.name, skills);
          if (saveRes?.resume) {
            const updated = await fetchResumes();
            setSavedResumes(updated.resumes);
            setSelectedResumeId(saveRes.resume.id);
            syncProfile({
              candidate_name: candidateName,
              active_resume_id: saveRes.resume.id,
              resume_text: rawText
            });
            setNotification({
              type: 'success',
              text: `Resume "${titleToSave}" uploaded and saved to your profiles!`
            });
          } else {
            syncProfile({ resume_text: rawText });
            setNotification({ type: 'info', text: `Resume loaded for this session. Click "Save to Profiles Library" below to persist it.` });
          }
          setTimeout(() => setNotification(null), 5000);
        } catch {
          // DB save failed (backend may be offline) — resume text is still loaded in the editor
          syncProfile({ resume_text: rawText });
          setNotification({ type: 'info', text: `Resume loaded! Backend offline — click "Save to Profiles Library" once the app starts to persist it.` });
          setTimeout(() => setNotification(null), 6000);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to parse resume file");
    } finally {
      setIsParsingResume(false);
    }
  };

  const toggleRound = (round: RoundType) => {
    let next: RoundType[];
    if (selectedRounds.includes(round)) {
      if (selectedRounds.length === 1) return; // Keep at least one round
      next = selectedRounds.filter((r) => r !== round);
    } else {
      next = [...selectedRounds, round];
    }
    setSelectedRounds(next);
    syncProfile({ selected_rounds: next });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let currentResumeId = selectedResumeId;

    // Auto-save if user entered or pasted text in new mode
    if (resumeText.trim() && selectedResumeId === "new") {
      const title = newResumeTitle.trim() || resumeFileName || `${candidateName || 'Candidate'}'s Resume`;
      try {
        const saved = await addSavedResume(title, resumeText, candidateName, resumeFileName, detectedSkills);
        if (saved?.resume?.id) {
          currentResumeId = saved.resume.id;
          setSelectedResumeId(saved.resume.id);
          const updated = await fetchResumes();
          setSavedResumes(updated.resumes);
        }
      } catch (err) {
        console.warn("Failed to auto-save new resume:", err);
      }
    } else if (currentResumeId !== "new") {
      activateSavedResume(currentResumeId).catch(() => {});
    }

    // Persist full candidate profile
    syncProfile({
      active_resume_id: currentResumeId !== "new" ? currentResumeId : undefined,
      resume_text: resumeText
    });

    setShowPermissionsModal(true);
  };

  const handlePermissionsConfirmed = () => {
    setShowPermissionsModal(false);
    const cachedKeys = getCachedKeys();
    const effectiveKey = initialKey || cachedKeys.keys.find(k => k.id === cachedKeys.active_key_id) || cachedKeys.keys.find(k => k.is_active) || cachedKeys.keys[0] || null;
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
      provider: effectiveKey ? effectiveKey.provider : 'gemini',
      api_key: "",
      key_id: effectiveKey ? effectiveKey.id : undefined,
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

          {/* Section 3: Resume Profiles & Parser */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-purple" />
                3. Candidate Resume & Saved Profiles
              </h2>
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-pill font-mono">
                {savedResumes.length} Saved {savedResumes.length === 1 ? 'Profile' : 'Profiles'}
              </span>
            </div>

            {/* Notification alert */}
            {notification && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 transition-all ${
                notification.type === 'success'
                  ? 'bg-green-50 text-brand-green border border-green-200'
                  : 'bg-blue-50 text-brand-blue border border-blue-200'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">{notification.text}</span>
              </div>
            )}

            {/* Resume Selection Dropdown & Controls */}
            <div className="bg-[#F8F9FA] p-4 rounded-xl border border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-900 mb-0.5 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-brand-purple" />
                    <span>Select Resume Profile:</span>
                  </label>
                  <span className="text-[11px] text-gray-500">
                    Switch between saved resumes or upload a new one for this session
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedResumeId}
                    onChange={handleSelectResume}
                    className="px-3 py-1.5 bg-white rounded-lg border-2 border-brand-purple/40 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-purple shadow-sm cursor-pointer min-w-[200px]"
                  >
                    <option value="new">➕ + Upload / Paste New Resume</option>
                    {savedResumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        📄 {r.title} {r.candidate_name ? `(${r.candidate_name})` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResumeId("new");
                      setResumeText("");
                      setDetectedSkills([]);
                      setResumeFileName("");
                      setNewResumeTitle("");
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Start fresh new resume"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-blue" />
                    <span>New</span>
                  </button>

                  {selectedResumeId !== 'new' && (
                    <>
                      <button
                        type="button"
                        onClick={handleUpdateCurrentResume}
                        disabled={isSavingResume}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-brand-purple font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                        title="Save edits back to this saved resume"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingResume ? "Saving..." : "Update Resume"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteResume(selectedResumeId, e)}
                        className="text-xs text-red-500 hover:text-red-700 p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 transition-colors cursor-pointer shadow-xs"
                        title="Delete this saved resume"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Status info banner */}
              {selectedResumeId !== 'new' ? (
                <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-brand-purple">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Active Profile: <strong>{savedResumes.find(r => r.id === selectedResumeId)?.title || "Resume"}</strong> {resumeFileName ? `(${resumeFileName})` : ''}</span>
                  </div>
                  <span className="text-[11px] font-mono text-purple-600">Auto-saved in local database</span>
                </div>
              ) : (
                <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-2.5 text-xs text-brand-blue flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Upload a PDF or paste text below. It will <strong>automatically save to your resume library</strong> and appear in the dropdown above for all future interviews.</span>
                </div>
              )}

              {/* Upload Dropzone & Text Area */}
              <div className="flex flex-col md:flex-row gap-3 pt-1">
                <label className="flex-1 border-2 border-dashed border-gray-300 hover:border-brand-purple rounded-xl p-5 text-center cursor-pointer transition-colors bg-white flex flex-col items-center justify-center">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs font-semibold text-gray-700">
                    {isParsingResume ? "Parsing resume..." : (resumeFileName || (selectedResumeId === 'new' ? "Upload Resume (PDF / TXT)" : "Replace with new file"))}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Click or drag & drop — auto-saved to library</span>
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
                    className="w-full p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 text-xs font-mono text-gray-700 leading-relaxed bg-white"
                  />
                </div>
              </div>

              {/* Save Resume Profile Bar (When new resume text is present) */}
              {selectedResumeId === 'new' && resumeText.trim().length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2 flex-1 w-full">
                    <Bookmark className="w-4 h-4 text-brand-purple shrink-0" />
                    <input
                      type="text"
                      value={newResumeTitle}
                      onChange={(e) => setNewResumeTitle(e.target.value)}
                      placeholder="Name this resume profile (e.g. SDE II Google Resume)..."
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCurrentResume}
                    disabled={isSavingResume}
                    className="px-4 py-1.5 bg-brand-purple hover:bg-purple-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingResume ? "Saving..." : "Save to Profiles Library"}</span>
                  </button>
                </div>
              )}

              {/* Detected Skills Pills */}
              {detectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  <span className="text-[11px] text-gray-500 font-medium">Parsed Skills:</span>
                  {detectedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="text-[10px] bg-purple-50 text-brand-purple border border-purple-200 px-2 py-0.5 rounded-pill font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
