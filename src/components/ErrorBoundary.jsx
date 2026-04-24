import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Noty] Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100dvh', gap: 16, padding: 24,
            fontFamily: 'Quicksand, sans-serif', background: '#FAFAFA',
          }}
        >
          <p style={{ fontSize: 40 }}>😵</p>
          <p style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>
            Quelque chose a planté
          </p>
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
            Une erreur inattendue s'est produite. Recharge la page pour continuer.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '12px 24px', borderRadius: 16,
              background: '#111827', color: 'white', fontWeight: 700,
              fontSize: 14, border: 'none', cursor: 'pointer',
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Recharger
          </button>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
