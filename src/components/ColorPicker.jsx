import { PALETTE } from '@/lib/constants';

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-3 flex-wrap">
      {PALETTE.map(p => (
        <button
          key={p.bg}
          onClick={() => onChange(p.bg)}
          title={p.name}
          aria-label={p.name}
          aria-pressed={value === p.bg}
          className="rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-700 shrink-0"
          style={{
            width: 40,
            height: 40,
            background: p.bg,
            transform: value === p.bg ? 'scale(1.25)' : 'scale(1)',
            boxShadow: value === p.bg
              ? `0 0 0 2px white, 0 0 0 4px ${p.bg}`
              : `0 2px 6px ${p.bg}88`,
          }}
        />
      ))}
    </div>
  );
}
