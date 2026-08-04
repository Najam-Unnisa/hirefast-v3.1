'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hirefast/shared-ui';
import { RequireAdmin } from '@/components/guards/require-admin';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import {
  createQuestion,
  deleteQuestion,
  getAssessment,
  listQuestions,
  listSkills,
  patchAssessmentStatus,
  updateAssessment,
  updateSkillWeight,
  type AdminAssessment,
  type AdminQuestion,
  type AdminSkill,
} from '@/services/admin.service';
import { ApiClientError } from '@/services/api-client';

const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'TRUE_FALSE',
  'SHORT_TEXT',
  'LONG_TEXT',
  'AUDIO',
  'VIDEO',
  'FILE_UPLOAD',
  'RATING',
];

function AssessmentDetailContent(): React.ReactElement {
  const params = useParams();
  const assessmentId = String(params.assessmentId);

  const [assessment, setAssessment] = useState<AdminAssessment | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [edit, setEdit] = useState({
    title: '',
    description: '',
    instructions: '',
    accessTier: 'FREE',
    durationMinutes: '',
    passingScore: '',
  });

  const [qForm, setQForm] = useState({
    prompt: '',
    questionType: 'MULTIPLE_CHOICE',
    code: '',
    points: '1',
  });
  const [creatingQ, setCreatingQ] = useState(false);
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, qPage, skillList] = await Promise.all([
        getAssessment(assessmentId),
        listQuestions(assessmentId, { limit: 100 }),
        listSkills(),
      ]);
      setAssessment(detail);
      setQuestions(qPage.items);
      setSkills(skillList);
      setEdit({
        title: detail.title,
        description: detail.description ?? '',
        instructions: detail.instructions ?? '',
        accessTier: detail.accessTier,
        durationMinutes: detail.durationMinutes?.toString() ?? '',
        passingScore: detail.passingScore?.toString() ?? '',
      });
      const drafts: Record<string, string> = {};
      for (const link of detail.skills) {
        drafts[link.skillId] = String(link.weight);
      }
      setWeightDrafts(drafts);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load assessment.');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveAssessment(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateAssessment(assessmentId, {
        title: edit.title,
        description: edit.description || undefined,
        instructions: edit.instructions || undefined,
        accessTier: edit.accessTier,
        durationMinutes: edit.durationMinutes ? Number(edit.durationMinutes) : undefined,
        passingScore: edit.passingScore ? Number(edit.passingScore) : undefined,
      });
      setMessage('Assessment saved.');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: string): Promise<void> {
    setError(null);
    try {
      await patchAssessmentStatus(assessmentId, status);
      setMessage(`Status set to ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Status update failed.');
    }
  }

  async function handleCreateQuestion(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setCreatingQ(true);
    setError(null);
    try {
      await createQuestion(assessmentId, {
        prompt: qForm.prompt,
        questionType: qForm.questionType,
        code: qForm.code || undefined,
        points: Number(qForm.points) || 1,
      });
      setQForm({ prompt: '', questionType: 'MULTIPLE_CHOICE', code: '', points: '1' });
      setMessage('Question created.');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Question create failed.');
    } finally {
      setCreatingQ(false);
    }
  }

  async function handleDeleteQuestion(questionId: string): Promise<void> {
    if (!window.confirm('Delete this question?')) return;
    try {
      await deleteQuestion(questionId);
      setMessage('Question deleted.');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed.');
    }
  }

  async function saveWeight(skillId: string): Promise<void> {
    const weight = Number(weightDrafts[skillId]);
    if (!Number.isFinite(weight)) {
      setError('Weight must be a number.');
      return;
    }
    try {
      await updateSkillWeight(assessmentId, skillId, weight);
      setMessage('Skill weight updated.');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Weight update failed.');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading assessment…" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error ?? 'Assessment not found.'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/assessments" className="text-sm text-[var(--hf-muted)] hover:underline">
            ← Assessments
          </Link>
          <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
            {assessment.title}
          </h1>
          <p className="mt-1 font-mono text-xs text-[var(--hf-muted)]">
            {assessment.code} · {assessment.slug} · v{assessment.version}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariant(assessment.status)}>{assessment.status}</Badge>
          {assessment.status !== 'PUBLISHED' ? (
            <Button type="button" size="sm" onClick={() => void changeStatus('PUBLISHED')}>
              Publish
            </Button>
          ) : null}
          {assessment.status !== 'DRAFT' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void changeStatus('DRAFT')}
            >
              Revert to draft
            </Button>
          ) : null}
          {assessment.status !== 'ARCHIVED' ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void changeStatus('ARCHIVED')}
            >
              Archive
            </Button>
          ) : null}
        </div>
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
        onSubmit={(e) => void saveAssessment(e)}
        className="grid gap-3 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4 sm:grid-cols-2"
      >
        <h2 className="text-sm font-semibold sm:col-span-2">Details</h2>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ed-title">Title</Label>
          <Input
            id="ed-title"
            value={edit.title}
            onChange={(e) => setEdit((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ed-desc">Description</Label>
          <Input
            id="ed-desc"
            value={edit.description}
            onChange={(e) => setEdit((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ed-inst">Instructions</Label>
          <Input
            id="ed-inst"
            value={edit.instructions}
            onChange={(e) => setEdit((f) => ({ ...f, instructions: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ed-tier">Access tier</Label>
          <select
            id="ed-tier"
            className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm"
            value={edit.accessTier}
            onChange={(e) => setEdit((f) => ({ ...f, accessTier: e.target.value }))}
          >
            <option value="FREE">FREE</option>
            <option value="PREMIUM">PREMIUM</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ed-dur">Duration (minutes)</Label>
          <Input
            id="ed-dur"
            type="number"
            value={edit.durationMinutes}
            onChange={(e) => setEdit((f) => ({ ...f, durationMinutes: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ed-pass">Passing score</Label>
          <Input
            id="ed-pass"
            type="number"
            value={edit.passingScore}
            onChange={(e) => setEdit((f) => ({ ...f, passingScore: e.target.value }))}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save details'}
          </Button>
        </div>
        <p className="text-xs text-[var(--hf-muted)] sm:col-span-2">
          Category: {assessment.categoryName ?? '—'} · Updated {formatDate(assessment.updatedAt)} ·{' '}
          {assessment.questionCount} questions · {assessment.attemptCount} attempts
        </p>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--hf-muted)]">
          Questions
        </h2>
        <form
          onSubmit={(e) => void handleCreateQuestion(e)}
          className="grid gap-3 rounded-xl border border-dashed border-[var(--hf-border)] p-4 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="q-prompt">Prompt</Label>
            <Input
              id="q-prompt"
              required
              value={qForm.prompt}
              onChange={(e) => setQForm((f) => ({ ...f, prompt: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-type">Type</Label>
            <select
              id="q-type"
              className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm"
              value={qForm.questionType}
              onChange={(e) => setQForm((f) => ({ ...f, questionType: e.target.value }))}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-code">Code (optional)</Label>
            <Input
              id="q-code"
              value={qForm.code}
              onChange={(e) => setQForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={creatingQ}>
              {creatingQ ? 'Adding…' : 'Add question'}
            </Button>
          </div>
        </form>

        {questions.length === 0 ? (
          <EmptyState title="No questions yet" description="Add questions before publishing." />
        ) : (
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.sortOrder}</TableCell>
                    <TableCell className="font-mono text-xs">{q.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{q.prompt}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.questionType}</Badge>
                    </TableCell>
                    <TableCell>{q.points}</TableCell>
                    <TableCell>{q.options.length}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleDeleteQuestion(q.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--hf-muted)]">
          Skill weights
        </h2>
        {assessment.skills.length === 0 ? (
          <div className="space-y-3">
            <EmptyState
              title="No skills linked"
              description="Link a skill by setting a weight below."
            />
            <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4">
              <p className="mb-3 text-sm text-[var(--hf-muted)]">Add skill weight</p>
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 12).map((skill) => (
                  <div key={skill.id} className="flex items-center gap-2">
                    <span className="text-sm">{skill.name}</span>
                    <Input
                      className="w-20"
                      value={weightDrafts[skill.id] ?? '1'}
                      onChange={(e) =>
                        setWeightDrafts((d) => ({ ...d, [skill.id]: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void saveWeight(skill.id)}
                    >
                      Set
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessment.skills.map((link) => (
                  <TableRow key={link.skillId}>
                    <TableCell>{link.skillName}</TableCell>
                    <TableCell className="font-mono text-xs">{link.skillCode}</TableCell>
                    <TableCell>
                      <Input
                        className="w-24"
                        value={weightDrafts[link.skillId] ?? String(link.weight)}
                        onChange={(e) =>
                          setWeightDrafts((d) => ({ ...d, [link.skillId]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void saveWeight(link.skillId)}
                      >
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function AssessmentDetailPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <AssessmentDetailContent />
    </RequireAdmin>
  );
}
