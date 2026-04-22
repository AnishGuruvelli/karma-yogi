export function LotusIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" className={className}>
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize="42">
        🧘
      </text>
    </svg>
  );
}
