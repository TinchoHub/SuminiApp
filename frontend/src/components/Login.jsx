// frontend/src/components/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../services/api';

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
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '24px' }}>
            📦 Control de Depósito
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Ingresa tus credenciales para acceder
          </p>
        </div>

        {/* ✅ Evaluación segura con Boolean() */}
        {Boolean(errorMsg) && (
            <div style={errorStyle}>
                    ⚠️ {typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg)}
            </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Correo Electrónico</label>
            <input
              type="email"
              placeholder="admin@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Iniciando sesión...' : '🔑 Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: '100vh',
  backgroundColor: '#f3f4f6',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px',
  fontFamily: 'system-ui, sans-serif'
};

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  maxWidth: '400px',
  width: '100%',
  padding: '32px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  border: '1px solid #e5e7eb'
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '6px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const buttonStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '700',
  cursor: 'pointer'
};

const errorStyle = {
  padding: '10px 14px',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  borderRadius: '6px',
  marginBottom: '16px',
  fontSize: '13px',
  fontWeight: '500',
  wordBreak: 'break-word'
};