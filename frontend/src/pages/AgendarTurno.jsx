// frontend/src/pages/AgendarTurno.jsx
import React, { useEffect, useState } from 'react';
import { validarTokenProveedor, agendarTurnoProveedor } from '../services/api';

export default function AgendarTurno() {
  // Extraer token y oc de la URL (Ej: /agendar/token123?oc=UUID)
  const pathnameParts = window.location.pathname.split('/');
  const token = pathnameParts[pathnameParts.length - 1];
  const urlParams = new URLSearchParams(window.location.search);
  const ocId = urlParams.get('oc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proveedor, setProveedor] = useState(null);
  const [oc, setOc] = useState(null);

  // Formulario
  const [fechaTurno, setFechaTurno] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [patenteVehiculo, setPatenteVehiculo] = useState('');
  const [datosChofer, setDatosChofer] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    async function validarEnlace() {
      if (!token || !ocId) {
        setError('El enlace de agendamiento es incompleto o inválido.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await validarTokenProveedor(token, ocId);

        if (res.ok) {
          setProveedor(res.proveedor);
          setOc(res.oc);
        } else {
          setError(res.error || 'No se pudo validar el acceso.');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'El enlace ha expirado o no es válido.');
      } finally {
        setLoading(false);
      }
    }

    validarEnlace();
  }, [token, ocId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fechaTurno || !horaInicio || !patenteVehiculo) {
      alert('Por favor, completa los campos requeridos (*).');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        orden_compra_id: oc.id,
        fecha_turno: fechaTurno,
        hora_inicio: horaInicio,
        patente_vehiculo: patenteVehiculo.toUpperCase(),
        datos_chofer: datosChofer
      };

      const res = await agendarTurnoProveedor(payload);
      if (res.ok) {
        setConfirmado(true);
      } else {
        alert(res.error || 'Ocurrió un error al agendar el turno.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error de conexión con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ textAlign: 'center', color: '#6b7280' }}>Verificando enlace de agendamiento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: '#dc2626', margin: '0 0 12px 0', textAlign: 'center' }}>Acceso Inválido</h2>
          <p style={{ color: '#4b5563', textAlign: 'center', lineHeight: '1.5' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (confirmado) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', fontSize: '50px', marginBottom: '12px' }}>✅</div>
          <h2 style={{ color: '#16a34a', margin: '0 0 8px 0', textAlign: 'center' }}>¡Turno Solicitado Con Éxito!</h2>
          <p style={{ color: '#4b5563', textAlign: 'center', marginBottom: '20px' }}>
            Hemos registrado tu solicitud de entrega para la Orden de Compra <strong>{oc?.numero_oc}</strong>.
          </p>
          <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>
            <p style={{ margin: '4px 0' }}>📅 <strong>Fecha:</strong> {fechaTurno}</p>
            <p style={{ margin: '4px 0' }}>⏰ <strong>Hora estimada:</strong> {horaInicio} hs</p>
            <p style={{ margin: '4px 0' }}>🚘 <strong>Patente:</strong> {patenteVehiculo.toUpperCase()}</p>
            {datosChofer && <p style={{ margin: '4px 0' }}>👤 <strong>Chofer:</strong> {datosChofer}</p>}
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', marginTop: '20px' }}>
            El equipo de depósito confirmará la recepción a la brevedad. Podrás cerrar esta ventana.
          </p>
        </div>
      </div>
    );
  }

  const hoyStr = new Date().toISOString().split('T')[0];

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Portal de Proveedores
          </span>
          <h2 style={{ margin: '4px 0 0', color: '#111827', fontSize: '22px' }}>Agendar Turno de Entrega</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Proveedor: <strong>{proveedor?.nombre}</strong>
          </p>
        </div>

        {/* Resumen de la Orden de Compra */}
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: '700', color: '#1e40af', fontSize: '15px' }}>OC: {oc?.numero_oc}</span>
            <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>⏰ Entrega Límite: {oc?.fecha_limite_entrega}</span>
          </div>

          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#1e3a8a' }}><strong>Detalle de Insumos Solicitados:</strong></p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#1e3a8a' }}>
            {oc?.orden_compra_items?.map((item) => (
              <li key={item.id}>
                {item.productos?.sku} - {item.productos?.descripcion} ({item.cantidad_solicitada} {item.productos?.unidad_medida || 'UNIDADES'})
              </li>
            ))}
          </ul>
        </div>

        {/* Formulario de Agendamiento */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Fecha de Entrega *</label>
              <input
                type="date"
                min={hoyStr}
                value={fechaTurno}
                onChange={(e) => setFechaTurno(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Horario Estimado *</label>
              <select
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="08:00">08:00 hs</option>
                <option value="09:00">09:00 hs</option>
                <option value="10:00">10:00 hs</option>
                <option value="11:00">11:00 hs</option>
                <option value="12:00">12:00 hs</option>
                <option value="13:00">13:00 hs</option>
                <option value="14:00">14:00 hs</option>
                <option value="15:00">15:00 hs</option>
                <option value="16:00">16:00 hs</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Patente del Vehículo / Camión *</label>
            <input
              type="text"
              placeholder="Ej: AA123CD o AB123CD"
              value={patenteVehiculo}
              onChange={(e) => setPatenteVehiculo(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Nombre y DNI del Chófer (Opcional)</label>
            <input
              type="text"
              placeholder="Ej: Juan Pérez - DNI 35.123.456"
              value={datosChofer}
              onChange={(e) => setDatosChofer(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={submitting} style={buttonStyle}>
            {submitting ? 'Reservando turno...' : '📅 Confirmar y Agendar Turno'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Estilos
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
  maxWidth: '560px',
  width: '100%',
  padding: '28px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
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
  backgroundColor: '#16a34a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '700',
  cursor: 'pointer'
};