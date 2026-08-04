'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/constants/app';
import { useSession } from '@/providers/session-provider';

const MINIMAL_SHELL_PATHS = new Set(['/', '/auth/callback']);

export function CandidateShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const { user, isGuest, status, signOut } = useSession();
  const minimal = MINIMAL_SHELL_PATHS.has(pathname);
  const registered = status === 'authenticated' && !isGuest;

  return (
    <div className="flex min-h-screen flex-col bg-transparent text-[var(--hf-foreground)]">
      <header
        className={
          minimal
            ? 'absolute inset-x-0 top-0 z-20'
            : 'border-b border-[var(--hf-border)] bg-[var(--hf-card)]/80 backdrop-blur'
        }
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={registered ? '/dashboard' : '/'}
            className={`font-display text-xl font-semibold tracking-tight ${
              minimal ? 'text-white' : 'text-[var(--hf-foreground)]'
            }`}
          >
            {APP_NAME}
          </Link>
          <nav
            aria-label="Primary"
            className={`flex flex-wrap items-center justify-end gap-3 text-sm ${
              minimal ? 'text-white/80' : 'text-[var(--hf-muted)]'
            }`}
          >
            {status === 'authenticated' && isGuest ? (
              <>
                <Link href="/welcome" className="opacity-90 hover:opacity-100">
                  Welcome
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="opacity-90 hover:opacity-100"
                >
                  Sign out
                </button>
              </>
            ) : null}
            {registered ? (
              <>
                <Link href="/dashboard" className="opacity-90 hover:opacity-100">
                  Dashboard
                </Link>
                <Link href="/assessments" className="opacity-90 hover:opacity-100">
                  Assessments
                </Link>
                <Link href="/history" className="opacity-90 hover:opacity-100">
                  History
                </Link>
                <Link href="/reports" className="opacity-90 hover:opacity-100">
                  Reports
                </Link>
                <Link href="/profile" className="opacity-90 hover:opacity-100">
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="opacity-90 hover:opacity-100"
                >
                  Sign out
                </button>
              </>
            ) : null}
            {status === 'authenticated' && user && !isGuest && !registered ? (
              <span className="max-w-[12rem] truncate">{user.email}</span>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {!minimal ? (
        <footer className="border-t border-[var(--hf-border)] py-8">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[var(--hf-muted)] sm:px-6">
            © {new Date().getFullYear()} {APP_NAME}. Become interview ready.
          </div>
        </footer>
      ) : null}
    </div>
  );
}
