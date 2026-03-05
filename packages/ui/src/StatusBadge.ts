import type { ReactNode } from 'react';

export interface StatusBadgeProps {
  status: string;
  children?: ReactNode;
}

// Note: This is the shared source of truth for StatusBadge.
// The apps/web version is a local copy for Next.js RSC compatibility.
// In a full monorepo setup, web would import from @aws/ui.

export function StatusBadge({ status }: StatusBadgeProps) {
  const configs: Record<string, { color: string; label: string }> = {
    SUCCESS: { color: '#10b981', label: 'SUCCESS' },
    FAILED: { color: '#ef4444', label: 'FAILED' },
    PENDING: { color: '#f59e0b', label: 'PENDING' },
    SKIPPED_NO_ROUTE: { color: '#64748b', label: 'SKIPPED' },
  };
  const cfg = configs[status] ?? configs['PENDING'];
  return (
    <span style={{ color: cfg.color, fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}
