'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  EmptyState,
  LoadingSpinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hirefast/shared-ui';
import { RequireAdmin } from '@/components/guards/require-admin';
import { statusBadgeVariant } from '@/lib/format';
import { listSkills, type AdminSkill } from '@/services/admin.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

function SkillsContent(): React.ReactElement {
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const data = await listSkills();
        if (!cancelled) {
          setSkills(data);
          trackClientEvent('admin.skills_viewed');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load skills.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading skills…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="mt-1 text-sm text-[var(--hf-muted)]">
          Platform skills and linked assessment weights.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {skills.length === 0 ? (
        <EmptyState title="No skills" description="Skills are seeded with the platform." />
      ) : (
        <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Linked assessments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell className="font-medium">{skill.name}</TableCell>
                  <TableCell className="font-mono text-xs">{skill.code}</TableCell>
                  <TableCell>{skill.domain ?? '—'}</TableCell>
                  <TableCell>
                    {skill.assessmentSkills.length === 0 ? (
                      <span className="text-[var(--hf-muted)]">None</span>
                    ) : (
                      <ul className="space-y-1">
                        {skill.assessmentSkills.map((link) => (
                          <li key={link.assessmentId} className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/assessments/${link.assessmentId}`}
                              className="text-sm text-[var(--hf-primary)] hover:underline"
                            >
                              {link.assessment.title}
                            </Link>
                            <Badge variant="outline">w={Number(link.weight)}</Badge>
                            <Badge variant={statusBadgeVariant(link.assessment.status)}>
                              {link.assessment.status}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function SkillsPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <SkillsContent />
    </RequireAdmin>
  );
}
