import React, { useState } from 'react';
import {
  Building2,
  FileText,
  ChevronRight,
  Upload,
  Layers,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

import {
  InterviewConfig,
  NamedKey,
  ROUND_ORDER,
  RoundType,
} from '../types';

import {
  parseResumePdf,
  parseResumeText,
} from '../services/api';

import { ParticleCanvas } from '../components/ParticleCanvas';
import { PermissionsCheckModal } from '../components/PermissionsCheckModal';

interface Props {
  initialKey: NamedKey | null;
  onBack: () => void;
  onStart: (config: InterviewConfig) => Promise<void>;
}

const COMPANIES = [
  'Google',
  'Amazon',
  'Meta',
  'Microsoft',
  'Apple',
  'Uber',
  'Netflix',
  'Adobe',
  'Flipkart',
  'Atlassian',
];

const ROLES = [
  'Software Engineer (SDE I/II)',
  'Backend Engineer',
  'Senior Software Engineer',
  'AI / Machine Learning Engineer',
  'Frontend Engineer',
  'Fullstack Engineer',
];

const ROUND_INFO: Record<
  RoundType,
  { title: string; mins: number; text: string }
> = {
  dsa_1: {
    title: 'DSA round 1',
    mins: 25,
    text: 'A fresh LeetCode problem. Ten tests, five hidden.',
  },
  dsa_2: {
    title: 'DSA round 2',
    mins: 25,
    text: 'A second, different problem.',
  },
  technical: {
    title: 'Technical round',
    mins: 40,
    text: 'Spoken deep-dive into your projects and CS fundamentals.',
  },
  hr: {
    title: 'HR round',
    mins: 20,
    text: 'Behavioral questions in STAR format.',
  },
};

export const SetupScreen: React.FC<Props> = ({
  initialKey,
  onBack,
  onStart,
}) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('Google');
  const [role, setRole] = useState(ROLES[0]);

  const [difficulty, setDifficulty] =
    useState<InterviewConfig['difficulty']>('Medium');

  const [rounds, setRounds] = useState<RoundType[]>([
    'dsa_1',
    'technical',
    'hr',
  ]);

  const [resume, setResume] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const [parsing, setParsing] = useState(false);

  const [context, setContext] = useState(
    'Realistic technical bar. Probe edge cases and performance trade-offs.'
  );

  const [showPerms, setShowPerms] = useState(false);
  const [error, setError] = useState('');

  const toggle = (round: RoundType) => {
    setRounds((current) => {
      if (current.includes(round)) {
        // Don't allow the user to deselect every round.
        if (current.length === 1) {
          return current;
        }

        return current.filter((item) => item !== round);
      }

      return [...current, round];
    });
  };

  const upload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);
    setError('');
    setParsing(true);

    try {
      const result =
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
          ? await parseResumePdf(file)
          : await parseResumeText(await file.text());

      setResume(result.raw_text);
      setSkills(result.detected_skills ?? []);
    } catch (err: any) {
      setError(`Resume: ${err.message}`);
      setFileName('');
    } finally {
      setParsing(false);
    }
  };

  const confirmed = async () => {
    setShowPerms(false);
    setError('');

    try {
      await onStart({
        candidate_name: name.trim() || 'Candidate',
        company: company.trim(),
        role: role.trim(),
        difficulty,

        // Always use the canonical round order instead of
        // the order in which the user clicked the checkboxes.
        selected_rounds: ROUND_ORDER.filter((round) =>
          rounds.includes(round)
        ),

        resume_text: resume,
        detected_skills: skills,
        additional_context: context,
        key_id: initialKey?.id,
      });
    } catch (err: any) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      setError(
        err.message || 'Could not start the interview.'
      );
    }
  };

  return (
    <div className="relative min-h-screen bg-white text-[#1A1A1A] pb-20">
      <ParticleCanvas count={60} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary text-xs px-3.5 py-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <span className="text-xs text-gray-500">
            Model:{' '}
            <strong className="text-gray-800">
              {initialKey
                ? `${initialKey.name} (${initialKey.provider})`
                : 'server default'}
            </strong>
          </span>
        </div>

        <h1 className="text-3xl font-medium tracking-tight text-center">
          Set up your interview
        </h1>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setShowPerms(true);
          }}
          className="rounded-card border border-[#E0E0E0] shadow-card p-6 md:p-8 space-y-6 bg-white"
        >

          {/* Company and role */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-blue" />
              Company and role
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {/* Name */}
              <label className="text-xs font-medium text-gray-700">
                Your name

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                />
              </label>

              {/* Company */}
              <label className="text-xs font-medium text-gray-700">
                Target company

                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  list="companies"
                  required
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                />

                <datalist id="companies">
                  {COMPANIES.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>

              {/* Role */}
              <label className="text-xs font-medium text-gray-700 md:col-span-2">
                Target role

                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  list="roles"
                  required
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                />

                <datalist id="roles">
                  {ROLES.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
            </div>

            {/* Difficulty */}
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1.5">
                Difficulty
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(['Easy', 'Medium', 'Hard', 'Brutal'] as const).map(
                  (level) => (
                    <button
                      type="button"
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`py-1.5 text-xs font-medium rounded-lg border ${
                        difficulty === level
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {level}
                    </button>
                  )
                )}
              </div>

              <p className="text-[11px] text-gray-500 mt-1.5">
                Brutal uses Hard problems. Problems come from
                LeetCode’s free set, filtered by company when we
                can match it.
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Rounds */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-green" />
              Rounds (only finished rounds are scored)
            </h2>

            <div className="grid md:grid-cols-2 gap-3">
              {ROUND_ORDER.map((round) => (
                <label
                  key={round}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer ${
                    rounds.includes(round)
                      ? 'border-brand-blue bg-[#EBF3FF]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={rounds.includes(round)}
                    onChange={() => toggle(round)}
                    className="mt-1 w-4 h-4"
                  />

                  <div>
                    <div className="text-xs font-semibold">
                      {ROUND_INFO[round].title}{' '}
                      <span className="font-mono font-normal text-gray-500">
                        · {ROUND_INFO[round].mins} min
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-1">
                      {ROUND_INFO[round].text}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Resume */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-purple" />
              Resume (PDF or text)
            </h2>

            <div className="flex flex-col md:flex-row gap-3">

              {/* Upload */}
              <label className="flex-1 border-2 border-dashed border-gray-300 hover:border-brand-blue rounded-xl p-5 text-center cursor-pointer bg-[#FAFAFA] flex flex-col items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />

                <span className="text-xs font-semibold text-gray-700">
                  {parsing
                    ? 'Reading…'
                    : fileName || 'Upload resume'}
                </span>

                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={upload}
                  className="hidden"
                />
              </label>

              {/* Paste resume */}
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                rows={3}
                placeholder="Or paste your resume text here…"
                className="flex-1 p-2.5 rounded-lg border border-gray-300 text-xs font-mono"
              />
            </div>

            <p className="text-[11px] text-gray-500">
              Your resume text is sent to the model provider
              you selected.
            </p>

            {/* Detected skills */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-gray-500">
                  Detected:
                </span>

                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] bg-blue-50 text-brand-blue border border-blue-200 px-2 py-0.5 rounded-pill"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Additional context */}
          <label className="block text-xs font-medium text-gray-700">
            Notes for the interviewer

            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
            />
          </label>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary text-xs px-6 py-2.5"
            >
              Next: camera and microphone check
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Permissions */}
      {showPerms && (
        <PermissionsCheckModal
          onProceed={confirmed}
          onCancel={() => setShowPerms(false)}
        />
      )}
    </div>
  );
};