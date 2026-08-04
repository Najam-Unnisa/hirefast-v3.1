import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { APP_NAME } from '@/constants/app';

export default function HomePage(): React.ReactElement {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col justify-center gap-8 px-4 py-16 sm:px-6">
        <div className="space-y-4">
          <Badge variant="secondary">Foundation Ready</Badge>
          <h1 className="font-display max-w-3xl text-4xl font-semibold tracking-tight text-[var(--hf-foreground)] sm:text-5xl md:text-6xl">
            {APP_NAME}
          </h1>
          <p className="max-w-xl text-lg text-[var(--hf-muted)]">
            AI-powered employability assessment platform. This is the candidate portal foundation —
            feature modules will build on this scaffold.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled aria-disabled="true">
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" disabled aria-disabled="true">
            View assessments
          </Button>
        </div>
        <p className="text-sm text-[var(--hf-muted)]">
          Authentication, assessments, and reports are not implemented in this initialization.
        </p>
      </div>
    </section>
  );
}
