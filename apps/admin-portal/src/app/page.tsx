'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Badge, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { APP_NAME } from '@/constants/app';
import { useSession } from '@/providers/session-provider';

export default function HomePage(): React.ReactElement {
  const router = useRouter();
  const { status, isAdmin } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      router.replace('/dashboard');
    }
  }, [status, isAdmin, router]);

  if (status === 'loading' || (status === 'authenticated' && isAdmin)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Loading…" />
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 10%, color-mix(in srgb, var(--hf-primary) 18%, transparent), transparent), radial-gradient(ellipse 60% 40% at 90% 80%, color-mix(in srgb, var(--hf-accent, var(--hf-primary)) 12%, transparent), transparent)',
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center gap-6 px-4 py-20 sm:px-6">
        <Badge variant="secondary" className="w-fit">
          <Shield className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Admin Portal
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--hf-foreground)] sm:text-5xl">
          {APP_NAME} Admin
        </h1>
        <p className="max-w-lg text-lg text-[var(--hf-muted)]">
          Platform operations console for candidates, assessments, evaluations, and settings.
          Administrator access required.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
