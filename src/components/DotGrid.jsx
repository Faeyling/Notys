export default function DotGrid({ dark = false }) {
  const dotColor = dark ? 'rgba(255,255,255,0.07)' : 'rgba(180,180,120,0.35)';
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: `radial-gradient(circle, ${dotColor} 1.2px, transparent 1.2px)`,
        backgroundSize: '22px 22px',
      }}
    />
  );
}
