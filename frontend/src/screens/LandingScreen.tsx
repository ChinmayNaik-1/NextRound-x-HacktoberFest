import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  History,
  Building2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { NamedKey, PastInterview } from '../types';
import {
  fetchNamedKeys,
  getCachedKeys,
  addNamedKey,
  verifyApiKey,
  deleteNamedKey,
  activateNamedKey,
  fetchInterviewHistory,
  deleteInterviewHistory
} from '../services/api';
import { ParticleCanvas } from '../components/ParticleCanvas';

interface LandingScreenProps {
  onStartSetup: (selectedKey: NamedKey | null) => void;
  onViewPastReport?: (interview: PastInterview) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onStartSetup,
  onViewPastReport
}) => {
  const [keys, setKeys] = useState<NamedKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  // New Key Form State
  const [keyName, setKeyName] = useState("");
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'groq' | 'anthropic'>('gemini');
  const [keyValue, setKeyValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Past Interviews State
  const [pastInterviews, setPastInterviews] = useState<PastInterview[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [deletingInterviewId, setDeletingInterviewId] = useState<string | null>(null);

  // Load Named Keys & Past Interviews on mount with cold-start retry
  useEffect(() => {
    // 1. Instant cache load
    const cached = getCachedKeys();
    if (cached.keys.length > 0) {
      setKeys(cached.keys);
      const active = cached.keys.find((k) => k.is_active) || cached.keys[0];
      setSelectedKeyId(active.id);
    }

    // 2. Network load with retry
    let isMounted = true;
    let attempts = 0;
    const syncKeys = async () => {
      const keysData = await fetchNamedKeys();
      if (!isMounted) return;
      if (keysData.keys.length > 0) {
        setKeys(keysData.keys);
        const active = keysData.keys.find((k) => k.is_active) || keysData.keys[0];
        setSelectedKeyId(active.id);
      } else if (attempts < 5) {
        attempts++;
        setTimeout(syncKeys, 1000);
      }
    };
    syncKeys();

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    const historyData = await fetchInterviewHistory();
    setPastInterviews(historyData);
    setIsLoadingHistory(false);
  };

  const loadData = async () => {
    const keysData = await fetchNamedKeys();
    setKeys(keysData.keys);
    if (keysData.keys.length > 0) {
      const active = keysData.keys.find((k) => k.is_active) || keysData.keys[0];
      setSelectedKeyId(active.id);
    }
    loadHistory();
  };

  const handleVerify = async () => {
    if (!keyValue.trim()) {
      setVerifyStatus({ valid: false, message: "Please input an API key first." });
      return;
    }
    setIsVerifying(true);
    setVerifyStatus(null);
    const res = await verifyApiKey(provider, keyValue);
    setIsVerifying(false);
    setVerifyStatus(res);
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim() || !keyValue.trim()) {
      alert("Please provide both a Key Name and the API Key.");
      return;
    }

    try {
      await addNamedKey(keyName, provider, keyValue, true);
      setKeyName("");
      setKeyValue("");
      setVerifyStatus(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add key");
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm("Remove this saved API key?")) {
      await deleteNamedKey(id);
      await loadData();
    }
  };

  const handleSelectKey = async (id: string) => {
    setSelectedKeyId(id);
    await activateNamedKey(id);
  };

  const handleDeleteInterview = async (interview: PastInterview) => {
    const label = `${interview.company} interview from ${new Date(interview.created_at).toLocaleDateString()}`;
    if (!window.confirm(`Delete this ${label} and its saved score? This cannot be undone.`)) return;

    setDeletingInterviewId(interview.id);
    try {
      await deleteInterviewHistory(interview.id);
      setPastInterviews((items) => items.filter((item) => item.id !== interview.id));
    } catch (err) {
      console.error("Failed to delete interview history", err);
      alert(err instanceof Error ? err.message : "Failed to delete interview. Please try again.");
    } finally {
      setDeletingInterviewId(null);
    }
  };

  const selectedKeyObj = keys.find((k) => k.id === selectedKeyId) || null;

  return (
    <div className="relative min-h-screen bg-white text-[#1A1A1A] pb-20 select-text">
      {/* NextRound Confetti Particles */}
      <ParticleCanvas count={100} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 space-y-10">
        
        {/* Antigravity Hero Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#F8F9FA] border border-[#E5E7EB] px-4 py-1.5 rounded-pill text-xs font-medium text-gray-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            Local Desktop Software Platform
          </div>

          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-[#1A1A1A]">
            Experience liftoff with your next-gen interview
          </h1>
          <p className="text-sm md:text-base text-gray-500 max-w-xl mx-auto">
            Add your LLM API keys below, select your model, and review your previous interview performance.
          </p>
        </div>

        {/* Section 1: API Key Inclusion & Named Key Manager */}
        <div className="bg-white rounded-card border border-[#E0E0E0] shadow-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-brand-blue" />
              <h2 className="text-lg font-medium text-gray-900">
                1. API Key Setup & Key Manager
              </h2>
            </div>
            <span className="text-xs bg-blue-50 text-brand-blue border border-blue-200 px-3 py-1 rounded-pill font-mono">
              Default: Google Gemma / Gemini 2.0
            </span>
          </div>

          {/* Form to Add a New Named API Key */}
          <form onSubmit={handleAddKey} className="bg-[#F8F9FA] p-5 rounded-xl border border-gray-200 space-y-4">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
              Add New Named Key
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Key Name / Label
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. My Personal Gemini"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  LLM Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="gemini">Google Gemini / Gemma (Recommended)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="groq">Groq (Llama 3.3 Fast)</option>
                  <option value="anthropic">Anthropic (Claude 3.5)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="Paste API Key here..."
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  required
                />
              </div>
            </div>

            {/* Verification Status Feedback */}
            {verifyStatus && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                verifyStatus.valid
                  ? "bg-green-50 text-brand-green border border-green-200"
                  : "bg-red-50 text-brand-red border border-red-200"
              }`}>
                {verifyStatus.valid ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{verifyStatus.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying}
                className="btn-secondary text-xs px-3.5 py-1.5"
              >
                {isVerifying ? "Verifying..." : "Verify Key Live"}
              </button>

              <button
                type="submit"
                className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Key to Local DB</span>
              </button>
            </div>
          </form>

          {/* List of Saved Named Keys */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Select Active Key for Interview ({keys.length} Saved)
              </label>
              <button
                type="button"
                onClick={loadData}
                className="text-[11px] text-gray-500 hover:text-brand-blue flex items-center gap-1 cursor-pointer transition-colors"
                title="Refresh keys from local DB"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync Keys</span>
              </button>
            </div>

            {keys.length > 0 ? (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    onClick={() => handleSelectKey(k.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedKeyId === k.id
                        ? "bg-blue-50/70 border-brand-blue shadow-sm"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={selectedKeyId === k.id}
                        onChange={() => handleSelectKey(k.id)}
                        className="w-4 h-4 text-brand-blue"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900">{k.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">
                            {k.provider}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-gray-400">
                          {k.masked_key}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteKey(k.id);
                      }}
                      className="text-gray-400 hover:text-brand-red p-1 transition-colors"
                      title="Delete Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center text-xs text-gray-500 bg-gray-50/50">
                No API keys saved yet. Add your Google Gemini or OpenAI key above.
              </div>
            )}
          </div>

          {/* Proceed to Setup CTA */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Active Key: <strong>{selectedKeyObj ? `${selectedKeyObj.name} (${selectedKeyObj.provider})` : "None (Test Mode)"}</strong>
            </span>

            <button
              onClick={() => onStartSetup(selectedKeyObj)}
              className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2 shadow-sm"
            >
              <span>Proceed to Interview Setup</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 2: Previous Interviews History */}
        <div className="bg-white rounded-card border border-[#E0E0E0] shadow-card p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <History className="w-5 h-5 text-brand-green" />
            <h2 className="text-lg font-medium text-gray-900">
              2. Previous Interview History
            </h2>
          </div>

          {isLoadingHistory ? (
            <div className="text-xs text-gray-400 py-4 text-center">
              Loading past interviews from local database...
            </div>
          ) : pastInterviews.length > 0 ? (
            <div className="space-y-3">
              {pastInterviews.map((item) => {
                const score = item.scores?.overall_score ?? "N/A";
                const recommendation = item.scores?.hiring_recommendation ?? item.status;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-gray-200 hover:border-brand-blue/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FAFAFA]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{item.company}</span>
                        <span className="text-xs text-gray-500">| {item.role}</span>
                        <span className="text-[11px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-mono">
                          {item.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>Candidate: {item.candidate_name}</span>
                        <span>Date: {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-lg font-medium text-brand-blue font-mono block">
                          {score !== "N/A" ? `${score}/100` : "In Progress"}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                          {recommendation}
                        </span>
                      </div>

                      {onViewPastReport && item.scores?.overall_score && (
                        <button
                          onClick={() => onViewPastReport(item)}
                          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                        >
                          <span>View Report</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteInterview(item)}
                        disabled={deletingInterviewId === item.id}
                        className="p-2 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete interview score"
                        aria-label={`Delete ${item.company} interview from ${new Date(item.created_at).toLocaleDateString()}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-gray-200 text-center space-y-2 bg-[#FAFAFA]">
              <Clock className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500">
                No previous interviews completed yet on this device.
              </p>
              <p className="text-[11px] text-gray-400">
                Your performance metrics, radar breakdown, and full transcripts will be saved here automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
