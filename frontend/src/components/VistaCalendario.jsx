// frontend/src/components/VistaCalendario.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { getTurnosCalendario } from '../services/api';

export function VistaCalendario() {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fecha base para la semana en pantalla (por defecto hoy)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');

  const fetchTurnos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTurnosCalendario();
      if (res.ok) {
        setTurnos(res.data);
      } else {
        setError('Error al obtener la grilla de turnos.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurnos();
  }, []);

  // Calcular los 7 días de la semana actual (de Lunes a Domingo)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    // Ajustar a Lunes (1 = Lunes, ..., 0 = Domingo)
    const dayOfWeek = curr.getDay();
    const distanceToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Formatear Date a YYYY-MM-DD local
  const formatDateISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Turnos organizados por fecha YYYY-MM-DD
  const turnosPorFecha = useMemo(() => {
    const map = {};
    turnos.forEach((t) => {
      // Aplicar filtro de búsqueda por patente, proveedor u OC
      if (filtroTexto.trim() !== '') {
        const q = filtroTexto.toLowerCase();
        const patenteMatch = t.patente_vehiculo?.toLowerCase().includes(q);
        const ocMatch = t.ordenes_compra?.numero_oc?.toLowerCase().includes(q);
        const provMatch = t.ordenes_compra?.proveedores?.nombre?.toLowerCase().includes(q);
        if (!patenteMatch && !ocMatch && !provMatch) return;
      }

      const f = t.fecha_turno;
      if (!map[f]) map[f] = [];
      map[f].push(t);
    });
    return map;
  }, [turnos, filtroTexto]);

  // Navegación de Semanas
  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getNombresDia = (d) => {
    const opciones = { weekday: 'short', day: 'numeric', month: 'short' };
    return d.toLocaleDateString('es-AR', opciones);
  };

  const esHoy = (d) => {
    const hoy = new Date();
    return (
      d.getDate() === hoy.getDate() &&
      d.getMonth() === hoy.getMonth() &&
      d.getFullYear() === hoy.getFullYear()
    );
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Controles Superiores: Navegación de Semana y Filtro */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          backgroundColor: '#f9fafb',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={handlePrevWeek} style={buttonNavStyle}>
            ◀ Semana Ant.
          </button>
          <button onClick={handleToday} style={buttonTodayStyle}>
            📅 Hoy
          </button>
          <button onClick={handleNextWeek} style={buttonNavStyle}>
            Semana Sig. ▶
          </button>
          <span style={{ fontWeight: '700', fontSize: '15px', marginLeft: '10px', color: '#111827' }}>
            {getNombresDia(weekDays[0])} — {getNombresDia(weekDays[6])}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Patente, OC o Proveedor..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              width: '220px'
            }}
          />
          <button onClick={fetchTurnos} style={buttonNavStyle}>
            🔄
          </button>
        </div>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Cargando grilla de turnos...</p>}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Grilla Semanal (7 Columnas) */}
      {!loading && !error && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '10px',
            alignItems: 'start'
          }}
        >
          {weekDays.map((dayDate) => {
            const dateStr = formatDateISO(dayDate);
            const turnosDelDia = turnosPorFecha[dateStr] || [];
            const hoyFlag = esHoy(dayDate);

            return (
              <div
                key={dateStr}
                style={{
                  backgroundColor: hoyFlag ? '#f0f9ff' : '#ffffff',
                  border: hoyFlag ? '2px solid #0284c7' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  minHeight: '380px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  overflow: 'hidden'
                }}
              >
                {/* Encabezado del Día */}
                <div
                  style={{
                    backgroundColor: hoyFlag ? '#0284c7' : '#f3f4f6',
                    color: hoyFlag ? '#ffffff' : '#374151',
                    padding: '8px 10px',
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: '13px',
                    textTransform: 'capitalize'
                  }}
                >
                  {getNombresDia(dayDate)}
                </div>

                {/* Lista de Turnos en la Columna */}
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {turnosDelDia.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', display: 'block', marginTop: '12px' }}>
                      Sin turnos
                    </span>
                  ) : (
                    turnosDelDia.map((t) => {
                      const ocNum = t.ordenes_compra?.numero_oc || 'OC N/A';
                      const provNom = t.ordenes_compra?.proveedores?.nombre || 'Proveedor N/A';
                      const hora = t.hora_inicio ? t.hora_inicio.slice(0, 5) : '00:00';
                      const estado = t.estado || 'SOLICITADO';

                      // Color del borde según estado del turno
                      let borderColor = '#3b82f6';
                      let bgColor = '#eff6ff';
                      if (estado === 'CONFIRMADO') {
                        borderColor = '#16a34a';
                        bgColor = '#f0fdf4';
                      } else if (estado === 'COMPLETADO') {
                        borderColor = '#059669';
                        bgColor = '#ecfdf5';
                      }

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTurno(t)}
                          style={{
                            backgroundColor: bgColor,
                            borderLeft: `4px solid ${borderColor}`,
                            borderRadius: '6px',
                            padding: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'transform 0.1s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: '#1f2937' }}>
                            <span>⏰ {hora} hs</span>
                            <span style={{ color: '#2563eb' }}>{t.patente_vehiculo}</span>
                          </div>
                          <div style={{ fontWeight: '600', marginTop: '4px', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {provNom}
                          </div>
                          <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                            {ocNum}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Detalle del Turno al hacer Clic */}
      {selectedTurno && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>🚛 Detalle del Turno Agendado</h3>
              <button onClick={() => setSelectedTurno(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#374151' }}>
              <div><strong>📅 Fecha y Hora:</strong> {selectedTurno.fecha_turno} a las {selectedTurno.hora_inicio?.slice(0, 5)} hs</div>
              <div><strong>🚘 Patente Vehículo:</strong> <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: '700', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{selectedTurno.patente_vehiculo}</span></div>
              <div><strong>📄 Orden de Compra:</strong> {selectedTurno.ordenes_compra?.numero_oc || 'N/A'}</div>
              <div><strong>🏢 Proveedor:</strong> {selectedTurno.ordenes_compra?.proveedores?.nombre || 'N/A'}</div>
              <div><strong>👤 Datos Chofer:</strong> {selectedTurno.datos_chofer || 'Sin registrar'}</div>
              <div><strong>📌 Estado:</strong> <span style={{ fontWeight: '700', color: '#2563eb' }}>{selectedTurno.estado}</span></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setSelectedTurno(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: '600' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos
const buttonNavStyle = {
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  color: '#374151',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '600'
};

const buttonTodayStyle = {
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid #2563eb',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '600'
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '450px',
  padding: '20px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
};