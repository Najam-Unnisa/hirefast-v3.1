'use client';

import Link from 'next/link';

export interface AppShellProps {
  children: React.ReactNode;
  appName: string;
  /** Portal-specific nav label, e.g. "Candidate Portal" */
  portalLabel: string;
}

export function SiteHeader({
  appName,
  portalLabel,
}: {
  appName: string;
  portalLabel: string;
}): React.ReactElement {
  return (
    <header className="border-b border-[var(--hf-border)] bg-[var(--hf-card)]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--hf-foreground)]"
        >
          {appName}
        </Link>
        <nav
          aria-label="Primary"
          className="flex items-center gap-4 text-sm text-[var(--hf-muted)]"
        >
          <span>{portalLabel}</span>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ appName }: { appName: string }): React.ReactElement {
  return (
    <footer className="border-t border-[var(--hf-border)] py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[var(--hf-muted)] sm:px-6">
        © {new Date().getFullYear()} {appName}. Foundation scaffold.
      </div>
    </footer>
  );
}

export function AppShell({ children, appName, portalLabel }: AppShellProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--hf-background)] text-[var(--hf-foreground)]">
      <SiteHeader appName={appName} portalLabel={portalLabel} />
      <main className="flex-1">{children}</main>
      <SiteFooter appName={appName} />
    </div>
  );
}
