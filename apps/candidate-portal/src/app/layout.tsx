import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { AppProviders, AppShell } from '@hirefast/shared-ui';
import { APP_DESCRIPTION, APP_NAME } from '@/constants/app';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${fraunces.variable} antialiased`}>
        <AppProviders>
          <AppShell appName={APP_NAME} portalLabel="Candidate Portal">
            {children}
          </AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
