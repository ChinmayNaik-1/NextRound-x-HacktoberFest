import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  BookOpen,
  ExternalLink,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { FinalReport, InterviewConfig, ChatMessage } from '../types';
import { ParticleCanvas } from '../components/ParticleCanvas';

interface ResultsScreenProps {
  report: FinalReport;
  config: InterviewConfig;
  allTranscripts: ChatMessage[];
  onRestart: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  report,
  config,
  allTranscripts,
  onRestart,
}) => {
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // SVG Circular progress ring calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (report.overall_score / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 85) return "#00B95C";
    if (score >= 70) return "#3186FF";
    if (score >= 50) return "#FBBC04";
    return "#FC413D";
  };

  const scoreColor = getScoreColor(report.overall_score);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative min-h-screen bg-white text-[#1A1A1A] pb-24 select-text">
      {/* Antigravity celebration particles */}
      <ParticleCanvas count={120} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12 space-y-10">
        
        {/* Top Header Card: Overall Score & Recommendation */}
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-[#F8F9FA] border border-[#E5E7EB] px-3.5 py-1 rounded-pill text-xs font-medium text-gray-700">
              <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
              Comprehensive Hiring Evaluation
            </div>
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-gray-900">
              Interview Evaluation for {config.candidate_name}
            </h1>
            <p className="text-sm text-gray-500">
              Role: <strong className="text-gray-700">{config.role}</strong> at <strong className="text-gray-700">{config.company}</strong>
            </p>

            <div className="pt-2 flex items-center justify-center md:justify-start gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Recommendation:
              </span>
              <span
                className="text-xs px-3 py-1 rounded-pill font-medium text-white shadow-sm"
                style={{ backgroundColor: scoreColor }}
              >
                {report.hiring_recommendation}
              </span>
            </div>
          </div>

          {/* Animated SVG Progress Ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width="160" height="160" className="-rotate-90">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#EAEAEA"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Animated Progress circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={scoreColor}
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1.4s ease-out" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-medium tracking-tight" style={{ color: scoreColor }}>
                {report.overall_score}
              </span>
              <span className="text-[11px] font-mono text-gray-400 uppercase">out of 100</span>
            </div>
          </div>
        </div>

        {/* Section 1: Per-Round Score Cards */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-blue" />
            Round Breakdown & Feedback
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.round_breakdowns.map((rb, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">{rb.round}</span>
                    <span
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${getScoreColor(rb.score)}15`,
                        color: getScoreColor(rb.score),
                      }}
                    >
                      {rb.score}/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {rb.feedback}
                  </p>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${rb.score}%`,
                      backgroundColor: getScoreColor(rb.score),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Radar / Skill Metrics */}
        <div className="bg-[#F8F9FA] rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
            Competency Radar Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(report.radar_metrics).map(([key, val]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="capitalize text-gray-700">
                    {key.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-gray-500">{val}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-brand-blue rounded-full transition-all duration-1000"
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-white rounded-xl border border-green-200 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-brand-green flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Observed Key Strengths
            </h3>
            <ul className="space-y-2 text-xs text-gray-700 leading-relaxed">
              {report.strengths.map((str, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 shrink-0" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-brand-red flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Growth & Weakness Areas
            </h3>
            <ul className="space-y-2 text-xs text-gray-700 leading-relaxed">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-red mt-1.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 4: Actionable Tips */}
        <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Actionable Next Steps & Preparation Tips
          </h3>
          <ul className="space-y-2 text-xs text-gray-700 leading-relaxed">
            {report.actionable_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 5: Curated Recommended Resources */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-purple" />
            Recommended Practice & Study Resources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {report.recommended_resources.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-lg border border-gray-200 hover:border-brand-blue hover:bg-blue-50/50 transition-all flex items-center justify-between text-xs group"
              >
                <div>
                  <span className="font-medium text-gray-900 group-hover:text-brand-blue block">
                    {res.title}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">{res.type}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-brand-blue" />
              </a>
            ))}
          </div>
        </div>

        {/* Section 6: Full Transcript Viewer (Collapsible) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFullTranscript(!showFullTranscript)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-800">
              View Full Interview Transcript ({allTranscripts.length} exchanges)
            </span>
            {showFullTranscript ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showFullTranscript && (
            <div className="p-6 border-t border-gray-100 max-h-96 overflow-y-auto space-y-3 text-xs bg-gray-50">
              {allTranscripts.map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-500">
                    {m.role === 'assistant' ? "Interviewer (AI)" : config.candidate_name}:
                  </span>
                  <p className="p-3 rounded-lg bg-white border border-gray-200 text-gray-800 whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
          <button
            onClick={handlePrint}
            className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF Report</span>
          </button>

          <button
            onClick={onRestart}
            className="btn-primary text-xs px-6 py-2.5 flex items-center gap-1.5 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Another Interview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
