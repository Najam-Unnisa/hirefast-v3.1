'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
  Briefcase,
} from 'lucide-react';
import { useState } from 'react';
import { APP_NAME } from '@/constants/app';
import { useSession } from '@/providers/session-provider';

const MINIMAL_SHELL_PATHS = new Set(['/', '/login', '/auth/callback']);

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/assessments', label: 'Assessments', icon: ClipboardList },
  { href: '/skills', label: 'Skills', icon: Sparkles },
  { href: '/evaluations', label: 'Evaluations', icon: FileText },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/hr-reviews', label: 'HR Review', icon: Briefcase },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
] as const;

function navActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const { user, status, isAdmin, signOut } = useSession();
  const minimal = MINIMAL_SHELL_PATHS.has(pathname);
  const showNav = status === 'authenticated' && isAdmin && !minimal;
  const [mobileOpen, setMobileOpen] = useState(false);

  if (minimal) {
    return (
      <div className="flex min-h-screen flex-col bg-transparent text-[var(--hf-foreground)]">
        <header className="absolute inset-x-0 top-0 z-20">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              href="/"
              className="font-display text-xl font-semibold tracking-tight text-[var(--hf-foreground)]"
            >
              {APP_NAME}
            </Link>
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--hf-muted)]">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Admin Portal
            </span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--hf-background)] text-[var(--hf-foreground)]">
      {showNav ? (
        <>
          <aside className="hidden w-60 shrink-0 border-r border-[var(--hf-border)] bg-[var(--hf-card)] lg:flex lg:flex-col">
            <div className="flex h-16 items-center gap-2 border-b border-[var(--hf-border)] px-5">
              <Shield className="h-5 w-5 text-[var(--hf-primary)]" aria-hidden="true" />
              <Link href="/dashboard" className="font-display text-lg font-semibold tracking-tight">
                {APP_NAME}
              </Link>
            </div>
            <nav aria-label="Admin" className="flex flex-1 flex-col gap-0.5 p-3">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = navActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-[var(--hf-primary)]/10 font-medium text-[var(--hf-primary)]'
                        : 'text-[var(--hf-muted)] hover:bg-[var(--hf-background)] hover:text-[var(--hf-foreground)]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-[var(--hf-border)] p-3">
              {user ? (
                <p className="mb-2 truncate px-3 text-xs text-[var(--hf-muted)]">{user.email}</p>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  void signOut().then(() => {
                    window.location.href = '/login';
                  })
                }
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--hf-muted)] transition-colors hover:bg-[var(--hf-background)] hover:text-[var(--hf-foreground)]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </aside>

          {mobileOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="relative z-50 flex h-full w-64 flex-col bg-[var(--hf-card)] shadow-xl">
                <div className="flex h-16 items-center justify-between border-b border-[var(--hf-border)] px-4">
                  <span className="font-display text-lg font-semibold">{APP_NAME}</span>
                  <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex flex-1 flex-col gap-0.5 p-3">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = navActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
                          active
                            ? 'bg-[var(--hf-primary)]/10 font-medium text-[var(--hf-primary)]'
                            : 'text-[var(--hf-muted)]'
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="border-t border-[var(--hf-border)] p-3">
                  <button
                    type="button"
                    onClick={() =>
                      void signOut().then(() => {
                        window.location.href = '/login';
                      })
                    }
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--hf-muted)]"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </aside>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-[var(--hf-border)] bg-[var(--hf-card)]/80 px-4 backdrop-blur lg:px-6">
          {showNav ? (
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}
          <div className="flex flex-1 items-center justify-between">
            <p className="text-sm font-medium text-[var(--hf-muted)]">Admin Portal</p>
            {user && showNav ? (
              <p className="hidden truncate text-sm text-[var(--hf-muted)] sm:block">
                {user.email}
              </p>
            ) : null}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
