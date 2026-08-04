'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  LoadingSpinner,
} from '@hirefast/shared-ui';
import { RequireAdmin } from '@/components/guards/require-admin';
import { formatDate } from '@/lib/format';
import { listSettings, upsertSetting, type PlatformSetting } from '@/services/admin.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

function SettingsContent(): React.ReactElement {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSettings();
      setSettings(data);
      const next: Record<string, string> = {};
      for (const item of data) {
        next[item.key] =
          typeof item.value === 'string' ? item.value : JSON.stringify(item.value, null, 2);
      }
      setDrafts(next);
      trackClientEvent('admin.settings_viewed');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function parseValue(raw: string): unknown {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return raw;
    }
  }

  async function save(key: string): Promise<void> {
    setSavingKey(key);
    setMessage(null);
    setError(null);
    try {
      await upsertSetting(key, { value: parseValue(drafts[key] ?? '') });
      setMessage(`Saved ${key}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed.');
    } finally {
      setSavingKey(null);
    }
  }

  async function createSetting(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSavingKey(newKey);
    setError(null);
    try {
      await upsertSetting(newKey.trim(), { value: parseValue(newValue) });
      setNewKey('');
      setNewValue('');
      setMessage('Setting created.');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed.');
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading settings…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[var(--hf-muted)]">
          Platform configuration keys. Values accept JSON or plain text.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertTitle>OK</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <form
        onSubmit={(e) => void createSetting(e)}
        className="space-y-3 rounded-xl border border-dashed border-[var(--hf-border)] p-4"
      >
        <h2 className="text-sm font-semibold">Add / upsert setting</h2>
        <div className="space-y-1.5">
          <Label htmlFor="new-key">Key</Label>
          <Input
            id="new-key"
            required
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="feature.flag.example"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-value">Value</Label>
          <textarea
            id="new-value"
            className="min-h-[80px] w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 py-2 text-sm"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder='true or {"enabled":true}'
          />
        </div>
        <Button type="submit" size="sm" disabled={savingKey === newKey}>
          Save setting
        </Button>
      </form>

      {settings.length === 0 ? (
        <EmptyState title="No settings" description="Create a platform setting above." />
      ) : (
        <ul className="space-y-4">
          {settings.map((item) => (
            <li
              key={item.id}
              className="space-y-3 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-medium">{item.key}</p>
                  {item.description ? (
                    <p className="text-xs text-[var(--hf-muted)]">{item.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {item.isPublic ? <Badge variant="secondary">Public</Badge> : null}
                  <span className="text-xs text-[var(--hf-muted)]">
                    {formatDate(item.updatedAt)}
                  </span>
                </div>
              </div>
              <textarea
                className="min-h-[88px] w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-background)] px-3 py-2 font-mono text-sm"
                value={drafts[item.key] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [item.key]: e.target.value }))}
              />
              <Button
                type="button"
                size="sm"
                disabled={savingKey === item.key}
                onClick={() => void save(item.key)}
              >
                {savingKey === item.key ? 'Saving…' : 'Save'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SettingsPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <SettingsContent />
    </RequireAdmin>
  );
}
