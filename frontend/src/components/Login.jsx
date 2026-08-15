// frontend/src/components/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../services/api';
import { IconPackage, IconKey, IconAlert, IconMail, IconLock } from './Icon';

export function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // 1. Autenticar con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (data?.session) {
      // 2. Obtener el perfil del usuario (rol, nombre)
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('nombre, rol')
        .eq('id', data.session.user.id)
        .single();

      if (perfilError) {
        console.warn('Error leyendo el perfil del usuario:', perfilError.message);
      }

      const usuarioPerfil = perfil || {
        nombre: data.session.user.email,
        rol: 'DEPOSITO'
      };

      if (onLoginSuccess) {
        onLoginSuccess(data.session, usuarioPerfil);
      }
    }

    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      {/* Panel de marca (lateral) */}
      <div style={brandPanelStyle}>
        <div style={brandGlowStyle} aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={brandMarkStyle}>
            <IconPackage size={26} />
          </div>
          <h2 style={brandTitleStyle}>Control de Depósito</h2>
          <p style={brandTextStyle}>
            Gestión de órdenes de compra, turnos de recepción y control de mercadería en un solo lugar.
          </p>
        </div>
        <div style={brandFooterStyle}>Consola de operaciones logísticas</div>
      </div>

      {/* Panel de formulario */}
      <div style={formPanelStyle}>
        <div style={cardStyle}>
          <div style={{ marginBottom: '28px' }}>
            <span style={eyebrowStyle}>Acceso al sistema</span>
            <h1 style={headingStyle}>Iniciar sesión</h1>
            <p style={subheadingStyle}>Ingresá tus credenciales para continuar.</p>
          </div>

          {Boolean(errorMsg) && (
            <div style={errorStyle}>
              <IconAlert size={16} />
              <span>{typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg)}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Correo electrónico</label>
              <div style={inputWrapStyle}>
                <span style={inputIconStyle}><IconMail size={17} /></span>
                <input
                  type="email"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => Object.assign(e.target.style, inputBlurStyle)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '26px' }}>
              <label style={labelStyle}>Contraseña</label>
              <div style={inputWrapStyle}>
                <span style={inputIconStyle}><IconLock size={17} /></span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => Object.assign(e.target.style, inputBlurStyle)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ ...buttonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
            >
              <IconKey size={17} />
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const FONT = "'Inter', system-ui, -apple-system, sans-serif";

const containerStyle = {
  minHeight: '100vh',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  backgroundColor: '#f5f0e6',
  fontFamily: FONT
};

// En pantallas anchas se ve el panel lateral; en angostas se apila.
if (typeof window !== 'undefined' && window.matchMedia('(min-width: 860px)').matches) {
  containerStyle.gridTemplateColumns = '0.9fr 1.1fr';
}

const brandPanelStyle = {
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '48px 44px',
  backgroundColor: '#211c17',
  color: '#f5f0e6'
};

const brandGlowStyle = {
  position: 'absolute',
  top: '-120px',
  right: '-80px',
  width: '320px',
  height: '320px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(217,119,6,0.28), transparent 68%)'
};

const brandMarkStyle = {
  width: '54px',
  height: '54px',
  borderRadius: '7px',
  backgroundColor: '#c2660a',
  color: '#211c17',
  display: 'grid',
  placeItems: 'center',
  marginBottom: '26px'
};

const brandTitleStyle = { margin: '0 0 12px', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em' };
const brandTextStyle = { margin: 0, fontSize: '15px', lineHeight: 1.6, color: '#b3a892', maxWidth: '340px' };
const brandFooterStyle = { position: 'relative', zIndex: 1, fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7a705f' };

const formPanelStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' };
const cardStyle = { width: '100%', maxWidth: '400px' };

const eyebrowStyle = { display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a4508', marginBottom: '10px' };
const headingStyle = { margin: '0 0 6px', color: '#211c17', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em' };
const subheadingStyle = { margin: 0, color: '#8c8172', fontSize: '14px' };

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a4038', marginBottom: '7px' };

const inputWrapStyle = { position: 'relative' };
const inputIconStyle = { position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#a89d8a', display: 'flex', pointerEvents: 'none' };
const inputStyle = {
  width: '100%',
  padding: '12px 14px 12px 42px',
  borderRadius: '7px',
  border: '1px solid #e6ded0',
  fontSize: '14px',
  fontFamily: FONT,
  color: '#211c17',
  backgroundColor: '#fffdf9',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s'
};
const inputFocusStyle = { borderColor: '#c2660a', boxShadow: '0 0 0 3px #f6e6d0' };
const inputBlurStyle = { borderColor: '#e6ded0', boxShadow: 'none' };

const buttonStyle = {
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '13px',
  borderRadius: '7px',
  border: 'none',
  backgroundColor: '#211c17',
  color: '#fffdf9',
  fontSize: '15px',
  fontWeight: 700,
  fontFamily: FONT
};

const errorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  padding: '11px 14px',
  backgroundColor: '#f3e0da',
  color: '#9c2b1f',
  border: '1px solid #e6c4b8',
  borderRadius: '7px',
  marginBottom: '20px',
  fontSize: '13px',
  fontWeight: 500,
  wordBreak: 'break-word'
};
