import React, {
  useEffect,
  useState,
} from 'react';

import {
  ArrowRight,
  AlertCircle,
  Settings,
  Timer,
  Mic,
  FileText,
  Clock,
} from 'lucide-react';

import {
  Health,
  NamedKey,
  PastInterview,
} from '../types';

import {
  checkBackendHealth,
  fetchInterviewHistory,
  fetchNamedKeys,
} from '../services/api';

import { ParticleCanvas } from '../components/ParticleCanvas';

interface Props {
  onStart: (key: NamedKey | null) => void;
  onSettings: () => void;
  onViewPastReport: (
    p: PastInterview
  ) => void;
}

const ROUNDS = [
  {
    name: 'Coding (DSA)',
    mins: 25,
    what: 'A real LeetCode problem, picked by company and difficulty. Python, C++ or Java. Ten tests, five of them hidden.',
    icon: Timer,
  },
  {
    name: 'Technical',
    mins: 40,
    what: 'A voice conversation about your resume projects, trade-offs, databases and concurrency.',
    icon: Mic,
  },
  {
    name: 'HR and behavioral',
    mins: 20,
    what: 'Situation, task, action, result. Follow-ups target what you actually said.',
    icon: FileText,
  },
];

const STEPS = [
  'Choose the company, role and how hard the bar should be.',
  'Upload your resume so the technical round asks about your projects.',
  'Pick your rounds. Only the rounds you finish are scored.',
  'Read your scorecard: per-round scores, strengths, gaps and what to practice next.',
];

export const HomeScreen: React.FC<Props> = ({
  onStart,
  onSettings,
  onViewPastReport,
}) => {
  const [health, setHealth] =
    useState<Health | null>(null);

  const [offline, setOffline] =
    useState(false);

  const [keys, setKeys] =
    useState<NamedKey[]>([]);

  const [past, setPast] =
    useState<PastInterview[]>([]);

  useEffect(() => {
    checkBackendHealth()
      .then(setHealth)
      .catch(() => setOffline(true));

    fetchNamedKeys()
      .then((r) => setKeys(r.keys))
      .catch(() => {});

    fetchInterviewHistory()
      .then(setPast)
      .catch(() => {});
  }, []);

  const activeKey =
    keys.find((k) => k.is_active) ??
    keys[0] ??
    null;

  const hasModel =
    !!activeKey ||
    !!health?.default_key_configured;

  const problem = offline
    ? 'The backend is not running. Start it with: uvicorn main:app --port 8000'
    : health && !health.sandbox_ready
      ? 'Docker was not found, so code cannot run safely. Install Docker Desktop and restart the backend.'
      : null;

  const start = () =>
    hasModel
      ? onStart(activeKey)
      : onSettings();

  return (
    <div className="relative min-h-screen bg-white text-[#1A1A1A] pb-20">
      <ParticleCanvas count={50} />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {problem && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{problem}</span>
          </div>
        )}

        <section className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center pt-16 pb-20">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.05]">
              Sit the interview before it counts.
            </h1>

            <p className="text-base text-gray-600 max-w-md leading-relaxed">
              Timed coding on real LeetCode problems, a spoken technical round and a behavioral round.
              Graded on what you wrote and said, not on a template.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={start}
                className="btn-primary"
              >
                {hasModel
                  ? 'Start an interview'
                  : 'Add a model key to start'}

                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onSettings}
                className="btn-secondary"
              >
                <Settings className="w-4 h-4" />
                Model and keys
              </button>
            </div>

            <p className="text-xs text-gray-500">
              {hasModel
                ? activeKey
                  ? `Using your saved ${activeKey.provider} key “${activeKey.name}”.`
                  : 'Using the server’s default model.'
                : 'You bring your own key (Gemini, OpenAI, Groq or Anthropic). It is stored encrypted on this machine.'}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="rounded-2xl border border-gray-200 bg-[#1C1C1E] shadow-elevated overflow-hidden text-left"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 text-xs">
              <span className="font-medium text-gray-900">
                DSA Round 1 · Medium
              </span>

              <span className="font-mono font-semibold px-2.5 py-0.5 rounded-pill bg-gray-100 text-gray-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                18:42
              </span>
            </div>

            <div className="grid grid-cols-[1fr_1.25fr]">
              <div className="bg-white p-4 text-[11px] leading-relaxed text-gray-700 space-y-2">
                <div className="font-semibold text-gray-900 text-xs">
                  Group Anagrams
                </div>

                <p>
                  Given an array of strings, group the anagrams together. You can return the answer in any order.
                </p>

                <div className="font-mono bg-gray-50 border border-gray-200 rounded p-2">
                  Input: ["eat","tea","tan","ate","nat","bat"]
                </div>
              </div>

              <pre className="p-4 text-[11px] leading-relaxed font-mono text-gray-300 overflow-hidden">
{`class Solution:
    def groupAnagrams(self, strs):
        groups = {}
        for w in strs:
            key = tuple(sorted(w))
            groups.setdefault(key, []).append(w)
        return list(groups.values())`}
              </pre>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-800 text-[11px] font-mono text-gray-400">
              {['1', '2', '3', '4', '5'].map(
                (n) => (
                  <span
                    key={n}
                    className="text-brand-green"
                  >
                    ✓ {n}
                  </span>
                )
              )}

              {['6', '7', '8', '9', '10'].map(
                (n) => (
                  <span key={n}>
                    🔒 {n}
                  </span>
                )
              )}
            </div>

            <div className="px-4 py-3 bg-white border-t border-gray-200 text-xs text-gray-700">
              <span className="font-semibold">
                Interviewer:
              </span>{' '}
              What happens to your complexity if every string is 10,000 characters long?
            </div>
          </div>
        </section>

        <section className="pb-20">
          <h2 className="text-2xl font-medium mb-6">
            What a session includes
          </h2>

          <div className="rounded-2xl border border-gray-200 divide-y divide-gray-200 bg-white">
            {ROUNDS.map(
              ({
                name,
                mins,
                what,
                icon: Icon,
              }) => (
                <div
                  key={name}
                  className="grid md:grid-cols-[220px_90px_1fr] gap-2 md:gap-6 items-start p-5"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Icon className="w-4 h-4 text-brand-blue" />
                    {name}
                  </div>

                  <div className="text-sm font-mono text-gray-500">
                    {mins} min
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    {what}
                  </p>
                </div>
              )
            )}
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Full screen and focus tracking keep the session honest. Your camera is a preview only and is never recorded.
          </p>
        </section>

        <section className="pb-20 grid md:grid-cols-[260px_1fr] gap-8">
          <h2 className="text-2xl font-medium">
            How a session runs
          </h2>

          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className="flex gap-4 items-start"
              >
                <span className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>

                <p className="text-sm text-gray-700 leading-relaxed">
                  {s}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="pb-8">
          <h2 className="text-2xl font-medium mb-4">
            Your past reports
          </h2>

          {past.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nothing yet. Finish an interview and its scorecard will be saved here.
            </p>
          ) : (
            <div className="rounded-2xl border border-gray-200 divide-y divide-gray-200 bg-white">
              {past.map((p) => {
                const score =
                  p.scores?.overall_score;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {p.company}{' '}
                        <span className="text-gray-500 font-normal">
                          · {p.role}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500">
                        {p.difficulty} ·{' '}
                        {new Date(
                          p.created_at + 'Z'
                        ).toLocaleDateString()}
                      </div>
                    </div>

                    {typeof score ===
                    'number' ? (
                      <button
                        onClick={() =>
                          onViewPastReport(p)
                        }
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        {score}/100 ·{' '}
                        {
                          p.scores
                            ?.hiring_recommendation
                        }

                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Unfinished
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};