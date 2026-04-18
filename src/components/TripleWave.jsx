import { motion } from 'framer-motion';

/**
 * TripleWave — 3 superposed waves.
 * vertical: if true renders vertically on the left side (landscape mode).
 * scrolled: if true retracts slightly.
 * wiggle: triggers a small agitation animation.
 */
export default function TripleWave({ color = '#FFC7EE', vertical = false, scrolled = false, wiggle = false }) {
  const h = scrolled ? 28 : 52;

  if (vertical) {
    return (
      <div className="absolute top-0 left-0 h-full" style={{ width: 52, pointerEvents: 'none' }}>
        <svg className="absolute top-0 left-0 h-full" viewBox="0 0 52 800" preserveAspectRatio="none" style={{ width: 52 }}>
          <path d="M52,0 C30,100 52,200 30,300 C8,400 52,500 30,600 C8,700 30,750 52,800 L0,800 L0,0 Z" fill={color} fillOpacity="0.5" />
        </svg>
        <svg className="absolute top-0 left-0 h-full" viewBox="0 0 52 800" preserveAspectRatio="none" style={{ width: 44 }}>
          <path d="M52,0 C20,120 44,240 20,360 C4,440 40,560 18,660 C4,730 30,770 52,800 L0,800 L0,0 Z" fill={color} fillOpacity="0.7" />
        </svg>
        <svg className="absolute top-0 left-0 h-full" viewBox="0 0 52 800" preserveAspectRatio="none" style={{ width: 34 }}>
          <path d="M52,0 C10,140 38,260 12,400 C0,480 36,580 10,700 C0,760 24,790 52,800 L0,800 L0,0 Z" fill={color} fillOpacity="1" />
        </svg>
      </div>
    );
  }

  return (
    <motion.div
      className="absolute bottom-0 w-full"
      animate={{ height: h, scaleY: wiggle ? [1, 1.06, 0.96, 1] : 1 }}
      transition={{ duration: wiggle ? 0.35 : 0.22, ease: 'easeInOut' }}
      style={{ pointerEvents: 'none' }}
    >
      <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 52" preserveAspectRatio="none" style={{ height: h }}>
        <path
          d="M0,26 C240,52 480,0 720,26 C960,52 1200,0 1440,26 L1440,52 L0,52 Z"
          fill={color} fillOpacity="0.45"
        />
      </svg>
      <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 52" preserveAspectRatio="none" style={{ height: h * 0.8 }}>
        <path
          d="M0,16 C280,42 560,0 840,20 C1060,36 1280,6 1440,20 L1440,52 L0,52 Z"
          fill={color} fillOpacity="0.7"
        />
      </svg>
      <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 52" preserveAspectRatio="none" style={{ height: h * 0.6 }}>
        <path
          d="M0,12 C180,32 400,0 640,18 C880,36 1100,4 1340,16 C1380,18 1420,12 1440,16 L1440,52 L0,52 Z"
          fill={color} fillOpacity="1"
        />
      </svg>
    </motion.div>
  );
}
