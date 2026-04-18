import { PALETTE } from '@/lib/constants';

export default function ColorPicker({ value, onChange, small = false }) {
  const size = small ? 24 : 28;
  return (
    <div className="flex gap-2 flex-wrap">
      {PALETTE.map(p => (
        <button
          key={p.bg}
          onClick={() => onChange(p.bg)}
          title={p.name}
          className="rounded-full transition-all duration-200 focus:outline-none shrink-0"
          style={{
            width: size,
            height: size,
            background: p.bg,
            transform: value === p.bg ? 'scale(1.3)' : 'scale(1)',
            boxShadow: value === p.bg
              ? `0 0 0 2px white, 0 0 0 4px ${p.bg}`
              : `0 2px 6px ${p.bg}88`,
          }}
        />
      ))}
    </div>
  );
}
