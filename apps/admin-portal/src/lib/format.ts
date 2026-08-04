export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat().format(value);
}

export function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' {
  const s = status.toUpperCase();
  if (['ACTIVE', 'PUBLISHED', 'COMPLETED', 'APPROVED', 'HEALTHY', 'PASSED'].includes(s)) {
    return 'success';
  }
  if (['PENDING', 'PROCESSING', 'IN_REVIEW', 'DRAFT', 'EVALUATING', 'SUBMITTED'].includes(s)) {
    return 'warning';
  }
  if (['FAILED', 'SUSPENDED', 'REJECTED', 'ARCHIVED', 'INACTIVE', 'DEGRADED'].includes(s)) {
    return 'destructive';
  }
  return 'secondary';
}
