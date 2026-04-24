import { SORT_OPTIONS } from '@/lib/constants';

export default function SortMenu({ value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          aria-label={opt.label}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full shrink-0 transition-all text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-600"
          style={{
            background: value === opt.id ? '#111827' : '#F3F4F6',
            color: value === opt.id ? 'white' : '#6B7280',
            fontFamily: 'Quicksand, sans-serif',
          }}
        >
          <span aria-hidden="true">{opt.icon}</span> {opt.label}
        </button>
      ))}
    </div>
  );
}
