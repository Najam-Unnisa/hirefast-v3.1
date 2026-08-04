'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
  LoadingSpinner,
} from '@hirefast/shared-ui';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';
import {
  fetchMyProfile,
  updateMyProfile,
  uploadResume,
  type ProfilePayload,
} from '@/services/profile.service';

export function ProfileManager(): React.ReactElement {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    headline: '',
    phone: '',
    bio: '',
    educationSummary: '',
    skillsSummary: '',
    locale: '',
    countryCode: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const data = await fetchMyProfile();
        if (cancelled) return;
        setProfile(data);
        setForm({
          firstName: data.profile?.firstName ?? '',
          lastName: data.profile?.lastName ?? '',
          headline: data.profile?.headline ?? '',
          phone: data.profile?.phone ?? '',
          bio: stripTags(data.profile?.bio ?? ''),
          educationSummary: extractTag(data.profile?.bio, 'education') ?? '',
          skillsSummary: extractTag(data.profile?.bio, 'skills') ?? '',
          locale: data.profile?.locale ?? '',
          countryCode: data.profile?.countryCode ?? '',
        });
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to load profile.');
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateMyProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        headline: form.headline || null,
        phone: form.phone || null,
        bio: form.bio || null,
        educationSummary: form.educationSummary || null,
        skillsSummary: form.skillsSummary || null,
        locale: form.locale || null,
        countryCode: form.countryCode || null,
      });
      trackClientEvent('profile.updated');
      setMessage('Profile saved.');
      const refreshed = await fetchMyProfile();
      setProfile(refreshed);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResume(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const contentBase64 = btoa(binary);
      await uploadResume({
        fileName: file.name.toLowerCase().includes('resume') ? file.name : `resume-${file.name}`,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
        contentBase64,
      });
      trackClientEvent('resume.uploaded');
      setMessage('Resume uploaded.');
      setProfile(await fetchMyProfile());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Resume upload failed.');
    } finally {
      setSaving(false);
      event.target.value = '';
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading profile…" />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <motion.form
        onSubmit={(event) => void handleSave(event)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold">Your profile</h1>
          <p className="text-[var(--hf-muted)]">
            Keep your details current so HireFast can personalize recommendations.
          </p>
          <p className="text-sm text-[var(--hf-muted)]">{profile?.email}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="First name"
            value={form.firstName}
            onChange={(v) => setForm({ ...form, firstName: v })}
            required
          />
          <Field
            label="Last name"
            value={form.lastName}
            onChange={(v) => setForm({ ...form, lastName: v })}
            required
          />
        </div>
        <Field
          label="Headline"
          value={form.headline}
          onChange={(v) => setForm({ ...form, headline: v })}
        />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} />
        <Field
          label="Education"
          value={form.educationSummary}
          onChange={(v) => setForm({ ...form, educationSummary: v })}
        />
        <Field
          label="Skills"
          value={form.skillsSummary}
          onChange={(v) => setForm({ ...form, skillsSummary: v })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Locale"
            value={form.locale}
            onChange={(v) => setForm({ ...form, locale: v })}
          />
          <Field
            label="Country"
            value={form.countryCode}
            onChange={(v) => setForm({ ...form, countryCode: v })}
          />
        </div>

        <div className="space-y-2 border-t border-[var(--hf-border)] pt-6">
          <Label htmlFor="resume">Resume</Label>
          <p className="text-sm text-[var(--hf-muted)]">
            {profile?.resume
              ? `Current: ${profile.resume.fileName}`
              : 'No resume uploaded yet. PDF preferred.'}
          </p>
          <Input
            id="resume"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf"
            onChange={(e) => void handleResume(e)}
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <Alert variant="success">
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </motion.form>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function extractTag(bio: string | null | undefined, tag: string): string | null {
  if (!bio) return null;
  const match = bio.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/${tag}\\]`, 'i'));
  return match?.[1]?.trim() || null;
}

function stripTags(bio: string): string {
  return bio
    .replace(/\[education\][\s\S]*?\[\/education\]/gi, '')
    .replace(/\[skills\][\s\S]*?\[\/skills\]/gi, '')
    .trim();
}
