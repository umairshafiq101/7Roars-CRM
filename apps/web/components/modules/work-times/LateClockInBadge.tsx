interface LateClockInBadgeProps {
  lateSeconds: number;
}

function fmtHM(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")} hrs, ${String(m).padStart(2, "0")} mins`;
}

export function LateClockInBadge({ lateSeconds }: LateClockInBadgeProps) {
  const isLate = lateSeconds > 60;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isLate
          ? "bg-red-100 text-red-600"
          : "bg-green-100 text-green-700"
      }`}
    >
      {fmtHM(isLate ? lateSeconds : 0)}
    </span>
  );
}
