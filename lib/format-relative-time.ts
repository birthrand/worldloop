/** Human-readable relative time (e.g. "Just now", "2h ago", "Yesterday"). */
export function formatRelativeTime(viewedAt: number): string {
  const diffMs = Date.now() - viewedAt;
  if (diffMs < 60_000) return "Just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return new Date(viewedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
