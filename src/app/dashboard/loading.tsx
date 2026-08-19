export default function DashboardLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-ink/40">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
        Loading…
      </div>
    </div>
  );
}
