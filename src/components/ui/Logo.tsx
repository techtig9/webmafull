export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="webmaGradient" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5B6CFF" />
          <stop offset="1" stopColor="#00D4B8" />
        </linearGradient>
      </defs>
      {/* corner-frame viewport, echoing the .corner-frame motif used on preview panels */}
      <path
        d="M4 15V8a4 4 0 0 1 4-4h7"
        stroke="url(#webmaGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M36 25v7a4 4 0 0 1-4 4h-7"
        stroke="url(#webmaGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* generation spark, centered */}
      <path
        d="M20 11.5L22.6 17.4L28.5 20L22.6 22.6L20 28.5L17.4 22.6L11.5 20L17.4 17.4Z"
        fill="url(#webmaGradient)"
      />
    </svg>
  );
}

export function Logo({
  size = 22,
  showWordmark = true,
  className = "",
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="font-display font-bold tracking-tight">
          webma
        </span>
      )}
    </span>
  );
}
