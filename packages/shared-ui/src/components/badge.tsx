import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--hf-primary)] text-[var(--hf-primary-foreground)]',
        secondary: 'border-transparent bg-[var(--hf-border)] text-[var(--hf-foreground)]',
        outline: 'border-[var(--hf-border)] text-[var(--hf-foreground)]',
        success: 'border-transparent bg-[var(--hf-success)] text-white',
        warning: 'border-transparent bg-[var(--hf-warning)] text-white',
        destructive: 'border-transparent bg-[var(--hf-destructive)] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): React.ReactElement {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
