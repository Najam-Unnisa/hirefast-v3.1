import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  className,
  label = 'Loading',
}: LoadingSpinnerProps): React.ReactElement {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)} role="status">
      <Loader2 className="h-5 w-5 animate-spin text-[var(--hf-primary)]" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
