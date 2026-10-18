import React, {
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import {
  NamedKey,
  Provider,
} from '../types';

import {
  ApiError,
  activateNamedKey,
  addNamedKey,
  deleteNamedKey,
  fetchNamedKeys,
  verifyApiKey,
} from '../services/api';

const PROVIDERS: {
  id: Provider;
  label: string;
}[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
  },
  {
    id: 'openai',
    label: 'OpenAI',
  },
  {
    id: 'groq',
    label: 'Groq (Llama)',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
  },
];

export const SettingsScreen: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const [keys, setKeys] =
    useState<NamedKey[]>([]);

  const [name, setName] =
    useState('');

  const [provider, setProvider] =
    useState<Provider>('gemini');

  const [value, setValue] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [status, setStatus] =
    useState<{
      ok: boolean;
      msg: string;
    } | null>(null);

  const load = async () => {
    try {
      const result =
        await fetchNamedKeys();

      setKeys(result.keys);
    } catch (e: any) {
      setStatus({
        ok: false,
        msg: e.message,
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const verify = async () => {
    if (!value.trim()) {
      setStatus({
        ok: false,
        msg: 'Paste an API key first.',
      });

      return;
    }

    setBusy(true);

    try {
      const r =
        await verifyApiKey(
          provider,
          value
        );

      setStatus({
        ok: r.valid,
        msg: r.message,
      });
    } catch (e: any) {
      setStatus({
        ok: false,
        msg: e.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const save = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setBusy(true);

    try {
      await addNamedKey(
        name,
        provider,
        value
      );

      setName('');
      setValue('');

      setStatus({
        ok: true,
        msg: 'Key saved and set as active.',
      });

      await load();
    } catch (err) {
      setStatus({
        ok: false,
        msg:
          err instanceof ApiError
            ? err.message
            : 'Could not save the key.',
      });
    } finally {
      setBusy(false);
    }
  };

  const activate = async (
    id: string
  ) => {
    await activateNamedKey(id).catch(
      () => {}
    );

    load();
  };

  const remove = async (
    id: string
  ) => {
    if (
      confirm(
        'Delete this saved key?'
      )
    ) {
      await deleteNamedKey(id).catch(
        () => {}
      );

      load();
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] pb-20">
      <div className="max-w-3xl mx-auto px-6 pt-8 space-y-6">
        <button
          onClick={onBack}
          className="btn-secondary text-xs px-3.5 py-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div>
          <h1 className="text-3xl font-medium tracking-tight">
            Model and keys
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Keys are encrypted on this machine and only ever sent to the provider you choose.
          </p>
        </div>

        <form
          onSubmit={save}
          className="rounded-card border border-[#E0E0E0] shadow-card p-6 space-y-4"
        >
          <div className="grid md:grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-600">
              Label

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
                placeholder="My Gemini key"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
              />
            </label>

            <label className="text-xs font-medium text-gray-600">
              Provider

              <select
                value={provider}
                onChange={(e) =>
                  setProvider(
                    e.target.value as Provider
                  )
                }
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
              >
                {PROVIDERS.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-medium text-gray-600">
              API key

              <input
                type="password"
                value={value}
                onChange={(e) =>
                  setValue(e.target.value)
                }
                required
                autoComplete="off"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono"
              />
            </label>
          </div>

          {status && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                status.ok
                  ? 'bg-green-50 text-brand-green border border-green-200'
                  : 'bg-red-50 text-brand-red border border-red-200'
              }`}
            >
              {status.ok ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}

              <span>
                {status.msg}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={verify}
              disabled={busy}
              className="btn-secondary text-xs px-4 py-1.5"
            >
              Test key
            </button>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary text-xs px-5 py-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Save key
            </button>
          </div>
        </form>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">
            Saved keys
          </h2>

          {keys.length === 0 && (
            <p className="text-xs text-gray-500">
              No keys saved yet.
            </p>
          )}

          {keys.map((k) => (
            <div
              key={k.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                k.is_active
                  ? 'border-brand-blue bg-blue-50/70'
                  : 'border-gray-200'
              }`}
            >
              <button
                onClick={() =>
                  activate(k.id)
                }
                className="text-left"
              >
                <div className="text-xs font-semibold">
                  {k.name}{' '}
                  <span className="text-gray-500 font-normal">
                    · {k.provider}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-gray-400">
                  {k.masked_key}
                  {k.is_active
                    ? ' · active'
                    : ' · click to use'}
                </div>
              </button>

              <button
                onClick={() =>
                  remove(k.id)
                }
                title="Delete key"
                className="text-gray-400 hover:text-brand-red p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};