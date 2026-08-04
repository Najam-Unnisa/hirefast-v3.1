import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-[var(--hf-border)] bg-[var(--hf-card)] text-[var(--hf-foreground)]',
      destructive:
        'border-[var(--hf-destructive)]/40 bg-[var(--hf-destructive)]/10 text-[var(--hf-destructive)]',
      success: 'border-[var(--hf-success)]/40 bg-[var(--hf-success)]/10 text-[var(--hf-success)]',
      warning: 'border-[var(--hf-warning)]/40 bg-[var(--hf-warning)]/10 text-[var(--hf-warning)]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps): React.ReactElement {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement {
  return <div className={cn('text-sm opacity-90', className)} {...props} />;
}
