import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '40px 20px', textAlign: 'center'
        }}>
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 48, height: 48, marginBottom: 16 }}>
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#f4f4f5' }}>
              Algo salio mal
            </h2>
            <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20, maxWidth: 400 }}>
              Ocurrio un error inesperado. Intenta recargar la pagina.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', background: '#dc2626', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              Recargar pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
