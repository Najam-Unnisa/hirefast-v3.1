import { cn } from '@/utils/cn';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[var(--hf-border)]/70', className)}
      aria-hidden="true"
      {...props}
    />
  );
}
