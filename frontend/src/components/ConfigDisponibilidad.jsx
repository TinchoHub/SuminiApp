// frontend/src/components/ConfigDisponibilidad.jsx
import React, { useState, useEffect } from 'react';
import { getConfiguracionDisponibilidad, updateConfiguracionDisponibilidad } from '../services/api';

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
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '22px' }}>⚙️ Días y Horarios de Atención</h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
          Define los días hábiles, rangos horarias de recepción y la capacidad de descarga por hora.
        </p>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Cargando configuración...</p>}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '20px', fontWeight: '600' }}>
          {successMessage}
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Habilitado</th>
                  <th style={{ padding: '12px 16px' }}>Día de la Semana</th>
                  <th style={{ padding: '12px 16px' }}>Hora Inicio</th>
                  <th style={{ padding: '12px 16px' }}>Hora Fin</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Cupos por Hora</th>
                </tr>
              </thead>
              <tbody>
                {disponibilidad.map((row) => (
                  <tr key={row.dia_semana} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: row.activo ? '#ffffff' : '#f9fafb' }}>
                    {/* Checkbox Activo */}
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="checkbox"
                        checked={row.activo}
                        onChange={(e) => handleChange(row.dia_semana, 'activo', e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>

                    {/* Día */}
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: row.activo ? '#1f2937' : '#9ca3af' }}>
                      {row.nombre_dia}
                    </td>

                    {/* Hora Inicio */}
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="time"
                        value={row.hora_inicio}
                        disabled={!row.activo}
                        onChange={(e) => handleChange(row.dia_semana, 'hora_inicio', e.target.value)}
                        style={inputStyle}
                        required={row.activo}
                      />
                    </td>

                    {/* Hora Fin */}
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="time"
                        value={row.hora_fin}
                        disabled={!row.activo}
                        onChange={(e) => handleChange(row.dia_semana, 'hora_fin', e.target.value)}
                        style={inputStyle}
                        required={row.activo}
                      />
                    </td>

                    {/* Cupos por hora */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={row.cupos_por_hora}
                        disabled={!row.activo}
                        onChange={(e) => handleChange(row.dia_semana, 'cupos_por_hora', Number(e.target.value))}
                        style={{ ...inputStyle, width: '70px', textAlign: 'center' }}
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
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {submitting ? 'Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const inputStyle = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '14px'
};