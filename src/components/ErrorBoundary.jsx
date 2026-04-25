import { Component } from 'react';

/* Extract "file.jsx:42" from the first meaningful line of a stack trace */
function parseLocation(stack) {
  if (!stack) return null;
  const lines = stack.split('\n');
  for (const line of lines) {
    /* Match "at ComponentName (http://…/src/components/Foo.jsx:42:10)" */
    const m = line.match(/\(?(https?:\/\/[^)]+\/src\/([^):]+):(\d+):\d+)\)?/);
    if (m) return `${m[2]}:${m[3]}`;
    /* Fallback: bare path without origin (vite dev sourcemaps) */
    const m2 = line.match(/src\/([^):]+):(\d+):\d+/);
    if (m2) return `${m2[1]}:${m2[2]}`;
  }
  return null;
}

export default class ErrorBoundary extends Component {
  state = { error: null, info: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[Noty] Uncaught render error:', error, info.componentStack);
  }

  render() {
    const { error, info } = this.state;
    if (error) {
      const location  = parseLocation(error.stack);
      /* componentStack lines look like "\n    at ComponentName (file:line)" */
      const compLines = info?.componentStack
        ?.trim()
        .split('\n')
        .slice(0, 4)
        .map(l => l.trim())
        .join('\n');

      return (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100dvh', gap: 12, padding: 24,
            fontFamily: 'Quicksand, sans-serif', background: '#FAFAFA',
          }}
        >
          <p style={{ fontSize: 36 }}>😵</p>
          <p style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>
            Quelque chose a planté
          </p>

          {/* Error message */}
          <p style={{
            color: '#dc2626', fontSize: 13, textAlign: 'center',
            maxWidth: 340, fontWeight: 600, wordBreak: 'break-word',
          }}>
            {error.message}
          </p>

          {/* File + line */}
          {location && (
            <p style={{
              fontSize: 11, color: '#6B7280', background: '#F3F4F6',
              borderRadius: 8, padding: '4px 10px', fontFamily: 'monospace',
            }}>
              📄 {location}
            </p>
          )}

          {/* Component stack (top 4 frames) */}
          {compLines && (
            <pre style={{
              fontSize: 10, color: '#6B7280', background: '#F3F4F6',
              borderRadius: 8, padding: '8px 12px', maxWidth: 360,
              overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              textAlign: 'left', margin: 0,
            }}>
              {compLines}
            </pre>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 4, padding: '11px 22px', borderRadius: 14,
              background: '#111827', color: 'white', fontWeight: 700,
              fontSize: 13, border: 'none', cursor: 'pointer',
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
