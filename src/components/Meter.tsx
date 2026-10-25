export function Meter({
  value,
  danger = false,
}: {
  value: number;
  danger?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`track ${danger || clamped >= 90 ? "track--error" : ""}`} role="presentation">
      <i style={{ width: `${clamped}%` }} />
    </div>
  );
}
