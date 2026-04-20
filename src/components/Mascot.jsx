import { motion } from 'framer-motion';

/**
 * Shared capybara body.
 * IMPORTANT: the two CENTRAL legs are drawn BEFORE the body so they sit
 * behind it (lower z/paint-order). The two OUTER legs are drawn last so
 * they appear in front and are raised to be fully attached to the body.
 */
function CapyBody({ x = 0, y = 0 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* ── Central legs — behind the body ── */}
      <rect x="50" y="98" width="14" height="18" rx="7" fill="#8a6e4f" />
      <rect x="65" y="98" width="14" height="18" rx="7" fill="#8a6e4f" />

      {/* ── Body ── */}
      <ellipse cx="60" cy="82" rx="36" ry="24" fill="#9e8060" />
      {/* Head */}
      <ellipse cx="60" cy="56" rx="26" ry="22" fill="#9e8060" />
      {/* Capybara rectangular snout */}
      <rect x="40" y="60" width="40" height="20" rx="10" fill="#8a6e4f" />
      {/* Nostrils */}
      <ellipse cx="50" cy="74" rx="3" ry="2.5" fill="#5c4030" />
      <ellipse cx="70" cy="74" rx="3" ry="2.5" fill="#5c4030" />
      {/* Eyes */}
      <circle cx="47" cy="50" r="5.5" fill="#2a1a0a" />
      <circle cx="73" cy="50" r="5.5" fill="#2a1a0a" />
      <circle cx="48.5" cy="48.5" r="2" fill="white" />
      <circle cx="74.5" cy="48.5" r="2" fill="white" />
      {/* Ears */}
      <ellipse cx="38" cy="38" rx="8" ry="6" fill="#8a6e4f" />
      <ellipse cx="82" cy="38" rx="8" ry="6" fill="#8a6e4f" />
      <ellipse cx="38" cy="38" rx="5" ry="3.5" fill="#c4956a" />
      <ellipse cx="82" cy="38" rx="5" ry="3.5" fill="#c4956a" />

      {/* ── Outer legs — raised so they emerge fully from the body ── */}
      <rect x="30" y="90" width="14" height="20" rx="7" fill="#8a6e4f" />
      <rect x="80" y="90" width="14" height="20" rx="7" fill="#8a6e4f" />
    </g>
  );
}

/* ── spa: sitting with mandarine on head ── */
function CapySpa() {
  return (
    <svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
      <CapyBody />
      {/* Mandarine */}
      <ellipse cx="60" cy="32" rx="10" ry="8" fill="#ffa520" />
      <path d="M60,24 Q62,28 60,32 Q58,28 60,24" fill="#ff8c00" opacity="0.5" />
      <path d="M53,27 Q57,29 60,32 Q56,30 53,27" fill="#ff8c00" opacity="0.5" />
      <path d="M67,27 Q63,29 60,32 Q64,30 67,27" fill="#ff8c00" opacity="0.5" />
      {/* Leaf */}
      <path d="M60,24 C58,18 56,16 55,17 C56,20 58,22 60,24Z" fill="#5a8a20" />
      <path d="M60,24 C62,18 64,16 65,17 C64,20 62,22 60,24Z" fill="#5a8a20" />
    </svg>
  );
}

/* ── float: among waves — large heart eyes ── */
function CapyFloat() {
  return (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
      {/* Water waves */}
      <path d="M0,115 Q30,108 60,115 Q90,122 120,115 L120,140 L0,140 Z" fill="#ffe0a0" opacity="0.8" />
      <path d="M0,120 Q30,114 60,120 Q90,126 120,120 L120,140 L0,140 Z" fill="#ffe0a0" />
      <CapyBody y={0} />

      {/* ── Heart eyes — enlarged, drawn on top of CapyBody's round eyes ── */}

      {/* Left heart — main shape */}
      <path
        d="M47,58 C34,50 34,38 47,43.5 C60,38 60,50 47,58 Z"
        fill="#c0306a"
      />
      {/* Left heart — relief highlight */}
      <path
        d="M46,53 C39,47 39,42 46,45.5 C53,42 53,47 46,53 Z"
        fill="#e060a0"
        opacity="0.6"
      />
      {/* Left heart — shine */}
      <circle cx="41" cy="43" r="2" fill="white" opacity="0.80" />

      {/* Right heart — main shape */}
      <path
        d="M73,58 C60,50 60,38 73,43.5 C86,38 86,50 73,58 Z"
        fill="#c0306a"
      />
      {/* Right heart — relief highlight */}
      <path
        d="M72,53 C65,47 65,42 72,45.5 C79,42 79,47 72,53 Z"
        fill="#e060a0"
        opacity="0.6"
      />
      {/* Right heart — shine */}
      <circle cx="67" cy="43" r="2" fill="white" opacity="0.80" />
    </svg>
  );
}

/* ── stars: among stars (used when favorites list has items) ── */
function CapyStars() {
  return (
    <svg viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
      {[[15,15],[110,20],[10,90],[115,85],[60,10],[20,50],[105,55]].map(([sx,sy], i) => (
        <text key={i} x={sx} y={sy} fontSize="12" textAnchor="middle" fill="#ffca28" opacity="0.8">★</text>
      ))}
      <CapyBody x={5} />
    </svg>
  );
}

/* ── snorkel / diving ── */
function CapySnorkel() {
  return (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
      {/* Water */}
      <path d="M0,90 Q30,82 60,90 Q90,98 120,90 L120,140 L0,140 Z" fill="#b4daf3" opacity="0.6" />
      <path d="M0,96 Q30,90 60,96 Q90,102 120,96 L120,140 L0,140 Z" fill="#b4daf3" opacity="0.8" />
      <CapyBody />
      {/* Diving mask */}
      <rect x="34" y="42" width="52" height="26" rx="10" fill="#1e3a5f" opacity="0.85" />
      <rect x="37" y="45" width="46" height="20" rx="8" fill="#b4daf3" opacity="0.5" />
      <ellipse cx="50" cy="55" rx="9" ry="8" fill="#b4daf3" opacity="0.6" />
      <ellipse cx="70" cy="55" rx="9" ry="8" fill="#b4daf3" opacity="0.6" />
      {/* Snorkel tube */}
      <path d="M86,44 Q96,36 96,20 Q96,14 100,14" stroke="#1e3a5f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="13" r="4" fill="#1e3a5f" />
    </svg>
  );
}

/* ── protector: capybara holding a giant key (NO backpack) ── */
function CapyProtector() {
  return (
    <svg viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg">
      <CapyBody x={10} />
      {/* Giant key */}
      <circle cx="115" cy="50" r="11" fill="none" stroke="#f0c040" strokeWidth="4" />
      <circle cx="115" cy="50" r="5" fill="none" stroke="#f0c040" strokeWidth="3" />
      <rect x="122" y="47" width="20" height="6" rx="3" fill="#f0c040" />
      <rect x="136" y="53" width="6" height="5" rx="1.5" fill="#f0c040" />
      <rect x="130" y="56" width="6" height="4" rx="1.5" fill="#f0c040" />
    </svg>
  );
}

const VARIANTS = {
  spa:       CapySpa,
  float:     CapyFloat,
  stars:     CapyStars,
  snorkel:   CapySnorkel,
  backpack:  CapyProtector,   // kept same key for backward-compat
  protector: CapyProtector,
};

export default function Mascot({ variant = 'spa', size = 100, animate = true, 'aria-hidden': ariaHidden }) {
  const Comp = VARIANTS[variant] || CapySpa;
  return (
    <motion.div
      aria-hidden={ariaHidden ?? true}
      style={{ width: size, height: size, flexShrink: 0 }}
      animate={animate ? { y: [0, -6, 0] } : {}}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Comp />
    </motion.div>
  );
}
