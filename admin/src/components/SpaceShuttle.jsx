export default function SpaceShuttle({ variant = 1, className }) {
  return (
    <div className={className ?? `space-shuttle space-shuttle-${variant}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <path d="M50 8 C44 26 36 46 36 74 L64 74 C64 46 56 26 50 8 Z" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1.5" />
        <path d="M50 8 C47 20 45 26 45 31 L55 31 C55 26 53 20 50 8 Z" fill="#0f172a" />
        <path d="M46 33 Q50 29 54 33 L54 38 Q50 36 46 38 Z" fill="#38bdf8" />
        <path d="M36 50 L12 76 L36 74 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
        <path d="M64 50 L88 76 L64 74 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
        <rect x="42" y="74" width="6" height="5" rx="1" fill="#334155" />
        <rect x="52" y="74" width="6" height="5" rx="1" fill="#334155" />
        <g className="thruster-flame">
          <polygon points="43,79 45,96 47,79" fill="#38bdf8" />
          <polygon points="53,79 55,96 57,79" fill="#a855f7" />
          <polygon points="48,79 50,99 52,79" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}
