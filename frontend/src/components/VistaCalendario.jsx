// frontend/src/components/VistaCalendario.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { getTurnosCalendario } from '../services/api';
import {
  IconChevronLeft, IconChevronRight, IconCalendar, IconRefresh,
  IconSearch, IconClose, IconClock, IconTruck, IconAlert
} from './Icon';

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
    <div style={{ fontFamily: FONT }}>
      {/* Controles Superiores: Navegación de Semana y Filtro */}
      <div style={toolbarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handlePrevWeek} style={navBtnStyle} title="Semana anterior">
            <IconChevronLeft size={16} />
          </button>
          <button onClick={handleToday} style={todayBtnStyle}>
            <IconCalendar size={15} /> Hoy
          </button>
          <button onClick={handleNextWeek} style={navBtnStyle} title="Semana siguiente">
            <IconChevronRight size={16} />
          </button>
          <span style={weekRangeStyle}>
            {getNombresDia(weekDays[0])} — {getNombresDia(weekDays[6])}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <span style={searchIconStyle}><IconSearch size={16} /></span>
            <input
              type="text"
              placeholder="Patente, OC o Proveedor..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              style={searchInputStyle}
            />
          </div>
          <button onClick={fetchTurnos} style={navBtnStyle} title="Actualizar">
            <IconRefresh size={16} />
          </button>
        </div>
      </div>

      {loading && <p style={loadingStyle}>Cargando grilla de turnos...</p>}

      {error && (
        <div style={errorStyle}><IconAlert size={16} /><span>{error}</span></div>
      )}

      {/* Grilla Semanal (7 Columnas) */}
      {!loading && !error && (
        <div style={gridStyle}>
          {weekDays.map((dayDate) => {
            const dateStr = formatDateISO(dayDate);
            const turnosDelDia = turnosPorFecha[dateStr] || [];
            const hoyFlag = esHoy(dayDate);

            return (
              <div
                key={dateStr}
                style={{
                  backgroundColor: '#fffdf9',
                  border: hoyFlag ? '1.5px solid #c2660a' : '1px solid #e6ded0',
                  borderRadius: '12px',
                  minHeight: '380px',
                  boxShadow: hoyFlag ? '0 4px 16px rgba(217,119,6,0.12)' : '0 1px 2px rgba(16,18,22,0.05)',
                  overflow: 'hidden'
                }}
              >
                {/* Encabezado del Día */}
                <div
                  style={{
                    backgroundColor: hoyFlag ? '#211c17' : '#f5f0e6',
                    color: hoyFlag ? '#fffdf9' : '#4a4038',
                    padding: '10px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    textTransform: 'capitalize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {hoyFlag && <span style={{ color: '#c2660a' }}>●</span>}
                  {getNombresDia(dayDate)}
                </div>

                {/* Lista de Turnos en la Columna */}
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {turnosDelDia.length === 0 ? (
                    <span style={emptyDayStyle}>Sin turnos</span>
                  ) : (
                    turnosDelDia.map((t) => {
                      const ocNum = t.ordenes_compra?.numero_oc || 'OC N/A';
                      const provNom = t.ordenes_compra?.proveedores?.nombre || 'Proveedor N/A';
                      const hora = t.hora_inicio ? t.hora_inicio.slice(0, 5) : '00:00';
                      const estado = t.estado || 'SOLICITADO';

                      // Color del borde según estado del turno
                      let borderColor = '#c2660a';
                      let bgColor = '#f6e6d0';
                      if (estado === 'CONFIRMADO') {
                        borderColor = '#3f6b1f';
                        bgColor = '#e9ecdd';
                      } else if (estado === 'COMPLETADO') {
                        borderColor = '#2d5016';
                        bgColor = '#e9ecdd';
                      }

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTurno(t)}
                          style={{
                            backgroundColor: bgColor,
                            borderLeft: `3px solid ${borderColor}`,
                            border: `1px solid ${borderColor}22`,
                            borderLeftWidth: '3px',
                            borderRadius: '8px',
                            padding: '9px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: '#211c17' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontVariantNumeric: 'tabular-nums' }}>
                              <IconClock size={12} /> {hora}
                            </span>
                            <span style={{ color: '#9a4508', fontFamily: 'monospace', fontSize: '11.5px' }}>{t.patente_vehiculo}</span>
                          </div>
                          <div style={{ fontWeight: 600, marginTop: '5px', color: '#4a4038', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {provNom}
                          </div>
                          <div style={{ color: '#8c8172', fontSize: '11px', marginTop: '2px' }}>
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
        <div style={overlayStyle} onMouseDown={(e) => e.target === e.currentTarget && setSelectedTurno(null)}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <span style={titleIconStyle}><IconTruck size={18} /></span>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#211c17', fontWeight: 800 }}>Detalle del Turno</h3>
              </div>
              <button onClick={() => setSelectedTurno(null)} style={closeButtonStyle} aria-label="Cerrar"><IconClose size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <DetalleFila label="Fecha y Hora" valor={`${selectedTurno.fecha_turno} · ${selectedTurno.hora_inicio?.slice(0, 5)} hs`} />
              <DetalleFila
                label="Patente Vehículo"
                valor={<span style={patenteStyle}>{selectedTurno.patente_vehiculo}</span>}
              />
              <DetalleFila label="Orden de Compra" valor={selectedTurno.ordenes_compra?.numero_oc || 'N/A'} />
              <DetalleFila label="Proveedor" valor={selectedTurno.ordenes_compra?.proveedores?.nombre || 'N/A'} />
              <DetalleFila label="Datos Chofer" valor={selectedTurno.datos_chofer || 'Sin registrar'} />
              <DetalleFila label="Estado" valor={<span style={{ fontWeight: 700, color: '#9a4508' }}>{selectedTurno.estado}</span>} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setSelectedTurno(null)} style={buttonCancelStyle}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetalleFila({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '11px 0', borderBottom: '1px solid #f1ebe0', fontSize: '14px' }}>
      <span style={{ color: '#8c8172', fontWeight: 500 }}>{label}</span>
      <span style={{ color: '#211c17', fontWeight: 600, textAlign: 'right' }}>{valor}</span>
    </div>
  );
}

const FONT = "'Inter', system-ui, sans-serif";
const toolbarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', backgroundColor: '#fffdf9', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e6ded0', boxShadow: '0 1px 2px rgba(16,18,22,0.05)', flexWrap: 'wrap', gap: '12px' };
const navBtnStyle = { display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '9px', border: '1px solid #e6ded0', backgroundColor: '#fffdf9', color: '#4a4038', cursor: 'pointer' };
const todayBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: 'none', backgroundColor: '#211c17', color: '#fffdf9', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: FONT };
const weekRangeStyle = { fontWeight: 700, fontSize: '14px', marginLeft: '8px', color: '#211c17', textTransform: 'capitalize' };
const searchIconStyle = { position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#a89d8a', display: 'flex', pointerEvents: 'none' };
const searchInputStyle = { padding: '9px 12px 9px 34px', borderRadius: '9px', border: '1px solid #e6ded0', fontSize: '13px', width: '230px', fontFamily: FONT, color: '#211c17', outline: 'none', boxSizing: 'border-box' };
const loadingStyle = { color: '#8c8172', fontSize: '14px' };
const errorStyle = { display: 'flex', alignItems: 'center', gap: '9px', padding: '12px 16px', backgroundColor: '#f3e0da', color: '#9c2b1f', border: '1px solid #e6c4b8', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 500 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'start' };
const emptyDayStyle = { fontSize: '12px', color: '#b6a996', fontStyle: 'italic', textAlign: 'center', display: 'block', marginTop: '14px' };
const overlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(16,18,22,0.55)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' };
const modalStyle = { backgroundColor: '#fffdf9', borderRadius: '10px', width: '100%', maxWidth: '460px', padding: '24px', boxShadow: '0 24px 60px rgba(16,18,22,0.28)', fontFamily: FONT, border: '1px solid #e6ded0' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1ebe0', paddingBottom: '14px' };
const titleIconStyle = { width: '34px', height: '34px', borderRadius: '9px', backgroundColor: '#f6e6d0', color: '#9a4508', display: 'grid', placeItems: 'center' };
const closeButtonStyle = { display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: '#f1ebe0', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#8c8172' };
const patenteStyle = { fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, backgroundColor: '#f1ebe0', color: '#211c17', padding: '3px 8px', borderRadius: '6px' };
const buttonCancelStyle = { padding: '10px 18px', borderRadius: '9px', border: '1px solid #e6ded0', backgroundColor: '#fffdf9', color: '#4a4038', cursor: 'pointer', fontWeight: 600, fontFamily: FONT, fontSize: '14px' };
