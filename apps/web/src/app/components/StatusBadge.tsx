import clsx from 'clsx';

const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
  SUCCESS: { color: 'text-accent-green border-accent-green/30 bg-accent-green/10', dot: 'bg-accent-green', label: 'SUCCESS' },
  FAILED: { color: 'text-accent-red border-accent-red/30 bg-accent-red/10', dot: 'bg-accent-red', label: 'FAILED' },
  PENDING: { color: 'text-accent-amber border-accent-amber/30 bg-accent-amber/10', dot: 'bg-accent-amber', label: 'PENDING' },
  SKIPPED_NO_ROUTE: { color: 'text-slate-400 border-slate-600 bg-slate-800/50', dot: 'bg-slate-500', label: 'SKIPPED' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig['PENDING'];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold tracking-widest', cfg.color)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}
