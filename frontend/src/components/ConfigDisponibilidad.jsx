// frontend/src/components/ConfigDisponibilidad.jsx
import React, { useState, useEffect } from 'react';
import { getConfiguracionDisponibilidad, updateConfiguracionDisponibilidad } from '../services/api';
import { IconClock, IconSave, IconCheck, IconAlert } from './Icon';

const DIAS_SEMANA_MAP = [
  { id: 1, nombre: 'Lunes' },
  { id: 2, nombre: 'Martes' },
  { id: 3, nombre: 'Miércoles' },
  { id: 4, nombre: 'Jueves' },
  { id: 5, nombre: 'Viernes' },
  { id: 6, nombre: 'Sábado' },
  { id: 0, nombre: 'Domingo' }
];

export function ConfigDisponibilidad() {
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getConfiguracionDisponibilidad();
      if (res.ok) {
        // Asegurar que existan los 7 días de la semana en la estructura local
        const dataMap = {};
        if (Array.isArray(res.data)) {
          res.data.forEach((item) => {
            dataMap[item.dia_semana] = item;
          });
        }

        const fullConfig = DIAS_SEMANA_MAP.map((dia) => {
          const exist = dataMap[dia.id];
          return {
            dia_semana: dia.id,
            nombre_dia: dia.nombre,
            hora_inicio: exist?.hora_inicio ? exist.hora_inicio.slice(0, 5) : '08:00',
            hora_fin: exist?.hora_fin ? exist.hora_fin.slice(0, 5) : '16:00',
            cupos_por_hora: exist?.cupos_por_hora ?? 2,
            activo: exist?.activo ?? (dia.id >= 1 && dia.id <= 5) // Lunes a Viernes activo por defecto
          };
        });

        setDisponibilidad(fullConfig);
      } else {
        setError('Error al cargar la configuración de disponibilidad.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (diaId, field, value) => {
    setDisponibilidad((prev) =>
      prev.map((d) => {
        if (d.dia_semana === diaId) {
          return { ...d, [field]: value };
        }
        return d;
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validar franjas horarias
    for (const item of disponibilidad) {
      if (item.activo) {
        if (item.hora_inicio >= item.hora_fin) {
          setError(`En ${item.nombre_dia}, la hora de inicio debe ser menor a la hora de fin.`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const res = await updateConfiguracionDisponibilidad(disponibilidad);
      if (res.ok) {
        setSuccessMessage('¡Configuración de disponibilidad guardada con éxito!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error || 'Ocurrió un error al guardar.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: FONT, maxWidth: '920px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={headingStyle}><IconClock size={20} /> Días y Horarios de Atención</h2>
        <p style={subheadingStyle}>
          Definí los días hábiles, los rangos horarios de recepción y la capacidad de descarga por hora.
        </p>
      </div>

      {loading && <p style={loadingStyle}>Cargando configuración...</p>}

      {error && (
        <div style={alertErrorStyle}><IconAlert size={16} /><span>{error}</span></div>
      )}

      {successMessage && (
        <div style={alertSuccessStyle}><IconCheck size={16} /><span>{successMessage}</span></div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit}>
          <div style={cardStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Habilitado</th>
                  <th style={thStyle}>Día de la Semana</th>
                  <th style={thStyle}>Hora Inicio</th>
                  <th style={thStyle}>Hora Fin</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Cupos por Hora</th>
                </tr>
              </thead>
              <tbody>
                {disponibilidad.map((row) => (
                  <tr key={row.dia_semana} style={{ borderBottom: '1px solid #f1ebe0', backgroundColor: row.activo ? '#fffdf9' : '#f7f2e8' }}>
                    {/* Checkbox Activo */}
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={row.activo}
                        onChange={(e) => handleChange(row.dia_semana, 'activo', e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#c2660a' }}
                      />
                    </td>

                    {/* Día */}
                    <td style={{ ...tdStyle, fontWeight: 700, color: row.activo ? '#211c17' : '#a89c88' }}>
                      {row.nombre_dia}
                    </td>

                    {/* Hora Inicio */}
                    <td style={tdStyle}>
                      <input
                        type="time"
                        value={row.hora_inicio}
                        disabled={!row.activo}
                        onChange={(e) => handleChange(row.dia_semana, 'hora_inicio', e.target.value)}
                        style={{ ...inputStyle, opacity: row.activo ? 1 : 0.5 }}
                        required={row.activo}
                      />
                    </td>

                    {/* Hora Fin */}
                    <td style={tdStyle}>
                      <input
                        type="time"
                        value={row.hora_fin}
                        disabled={!row.activo}
                        onChange={(e) => handleChange(row.dia_semana, 'hora_fin', e.target.value)}
                        style={{ ...inputStyle, opacity: row.activo ? 1 : 0.5 }}
                        required={row.activo}
                      />
                    </td>

                    {/* Cupos por hora */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={row.cupos_por_hora}
                        disabled={!row.activo}
                        onChange={(e) => handleChange(row.dia_semana, 'cupos_por_hora', Number(e.target.value))}
                        style={{ ...inputStyle, width: '72px', textAlign: 'center', opacity: row.activo ? 1 : 0.5 }}
                        required={row.activo}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{ ...submitBtnStyle, opacity: submitting ? 0.6 : 1 }}
            >
              <IconSave size={16} />
              {submitting ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const FONT = "'Inter', system-ui, sans-serif";
const headingStyle = { display: 'flex', alignItems: 'center', gap: '9px', margin: 0, color: '#211c17', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.01em' };
const subheadingStyle = { margin: '6px 0 0', color: '#8c8172', fontSize: '14px' };
const loadingStyle = { color: '#8c8172', fontSize: '14px' };
const alertErrorStyle = { display: 'flex', alignItems: 'center', gap: '9px', padding: '12px 16px', backgroundColor: '#f3e0da', color: '#9c2b1f', border: '1px solid #e6c4b8', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 500 };
const alertSuccessStyle = { display: 'flex', alignItems: 'center', gap: '9px', padding: '12px 16px', backgroundColor: '#e9ecdd', color: '#3f6b1f', border: '1px solid #d2d9c0', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 600 };
const cardStyle = { backgroundColor: '#fffdf9', border: '1px solid #e6ded0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,18,22,0.05)' };
const thStyle = { padding: '13px 16px', backgroundColor: '#f5f0e6', color: '#8c8172', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #e6ded0' };
const tdStyle = { padding: '14px 16px', fontSize: '14px', color: '#4a4038' };
const inputStyle = { padding: '8px 10px', borderRadius: '9px', border: '1px solid #e6ded0', fontSize: '14px', fontFamily: FONT, color: '#211c17', outline: 'none' };
const submitBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '7px', backgroundColor: '#211c17', color: '#fffdf9', border: 'none', padding: '11px 20px', borderRadius: '9px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT };
