export function LotusIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="28" cy="28" r="6" fill="currentColor" opacity="0.9" />
      <ellipse cx="28" cy="16" rx="5" ry="10" fill="currentColor" opacity="0.7" />
      <ellipse cx="28" cy="40" rx="5" ry="10" fill="currentColor" opacity="0.7" />
      <ellipse cx="16" cy="28" rx="10" ry="5" fill="currentColor" opacity="0.7" />
      <ellipse cx="40" cy="28" rx="10" ry="5" fill="currentColor" opacity="0.7" />
      <ellipse cx="19.5" cy="19.5" rx="4.5" ry="9" fill="currentColor" opacity="0.5" transform="rotate(-45 19.5 19.5)" />
      <ellipse cx="36.5" cy="36.5" rx="4.5" ry="9" fill="currentColor" opacity="0.5" transform="rotate(-45 36.5 36.5)" />
      <ellipse cx="36.5" cy="19.5" rx="4.5" ry="9" fill="currentColor" opacity="0.5" transform="rotate(45 36.5 19.5)" />
      <ellipse cx="19.5" cy="36.5" rx="4.5" ry="9" fill="currentColor" opacity="0.5" transform="rotate(45 19.5 36.5)" />
    </svg>
  );
}
