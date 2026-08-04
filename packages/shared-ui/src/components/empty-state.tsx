import { Inbox } from 'lucide-react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'Content will appear once available.',
  className,
  action,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--hf-border)] px-6 py-12 text-center',
        className,
      )}
    >
      <Inbox className="h-10 w-10 text-[var(--hf-muted)]" aria-hidden="true" />
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--hf-foreground)]">{title}</h3>
        <p className="max-w-sm text-sm text-[var(--hf-muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
