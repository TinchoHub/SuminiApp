// frontend/src/pages/AgendarTurno.jsx
import React, { useEffect, useState } from 'react';
import {
  validarTokenProveedor,
  agendarTurnoProveedor,
  getConfiguracionDisponibilidadPublica
} from '../services/api';
import {
  IconTruck,
  IconPackage,
  IconClock,
  IconCalendar,
  IconAlert,
  IconCheck,
  IconUser
} from '../components/Icon';

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

  // Configuración de disponibilidad cargada desde el backend
  const [configDisponibilidad, setConfigDisponibilidad] = useState([]);
  const [opcionesHoras, setOpcionesHoras] = useState([
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
  ]);

  // Formulario
  const [fechaTurno, setFechaTurno] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [patenteVehiculo, setPatenteVehiculo] = useState('');
  const [datosChofer, setDatosChofer] = useState('');
  const [advertenciaFecha, setAdvertenciaFecha] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  // Cargar datos de la OC y la configuración de horarios permitidos
  useEffect(() => {
    async function inicializar() {
      if (!token || !ocId) {
        setError('El enlace de agendamiento es incompleto o inválido.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1. Validar la OC con el token
        const resVal = await validarTokenProveedor(token, ocId);

        if (resVal.ok) {
          setProveedor(resVal.proveedor);
          setOc(resVal.oc);
        } else {
          setError(resVal.error || 'No se pudo validar el acceso.');
          setLoading(false);
          return;
        }

        // 2. Cargar la configuración de cupos y horarios públicos
        try {
          const resConfig = await getConfiguracionDisponibilidadPublica();
          if (resConfig.ok && Array.isArray(resConfig.data)) {
            setConfigDisponibilidad(resConfig.data);
          }
        } catch (errConfig) {
          console.warn('No se pudo cargar la configuración de horarios, se usarán rangos por defecto.');
        }

      } catch (err) {
        setError(err.response?.data?.error || 'El enlace ha expirado o no es válido.');
      } finally {
        setLoading(false);
      }
    }

    inicializar();
  }, [token, ocId]);

  // Validar si el día seleccionado está activo y calcular los horarios permitidos
  const handleFechaChange = (e) => {
    const selectedDate = e.target.value;
    setAdvertenciaFecha(null);

    if (!selectedDate) {
      setFechaTurno('');
      return;
    }

    // 1. Validar fecha límite de entrega de la OC
    if (oc?.fecha_limite_entrega && selectedDate > oc.fecha_limite_entrega) {
      setAdvertenciaFecha(`La fecha seleccionada supera la Fecha Límite de Entrega (${oc.fecha_limite_entrega}).`);
      setFechaTurno('');
      return;
    }

    // 2. Obtener el número de día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
    const fechaObj = new Date(`${selectedDate}T00:00:00Z`);
    const numDiaSemana = fechaObj.getUTCDay();
    const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // 3. Buscar en la configuración por dia_semana (número)
    if (configDisponibilidad.length > 0) {
      const configDia = configDisponibilidad.find(
        (c) => Number(c.dia_semana) === numDiaSemana
      );

      // Si no existe o está inactivo (activo === false)
      if (!configDia || !configDia.activo) {
        setAdvertenciaFecha(`Los días ${NOMBRES_DIAS[numDiaSemana]} no están habilitados para recepción de mercadería.`);
        setFechaTurno('');
        return;
      }

      // 4. Generar la lista de horarios disponibles según el rango configurado para ese día
      if (configDia.hora_inicio && configDia.hora_fin) {
        const startH = parseInt(configDia.hora_inicio.split(':')[0], 10) || 8;
        const endH = parseInt(configDia.hora_fin.split(':')[0], 10) || 17;

        const horasGeneradas = [];
        for (let h = startH; h < endH; h++) {
          horasGeneradas.push(h < 10 ? `0${h}:00` : `${h}:00`);
        }

        if (horasGeneradas.length > 0) {
          setOpcionesHoras(horasGeneradas);
          setHoraInicio(horasGeneradas[0]);
        }
      }
    }

    setFechaTurno(selectedDate);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAdvertenciaFecha(null);

    if (!fechaTurno || !horaInicio || !patenteVehiculo) {
      alert('Por favor, completa todos los campos requeridos (*).');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        orden_compra_id: oc.id,
        fecha_turno: fechaTurno,
        hora_inicio: horaInicio,
        patente_vehiculo: patenteVehiculo.toUpperCase().trim(),
        datos_chofer: datosChofer.trim()
      };

      const res = await agendarTurnoProveedor(payload);
      if (res.ok) {
        setConfirmado(true);
      } else {
        alert(res.error || 'Ocurrió un error al agendar el turno.');
      }
    } catch (err) {
      const msgErr = err.response?.data?.error || 'Error de conexión con el servidor.';
      alert(msgErr);
    } finally {
      setSubmitting(false);
    }
  };

  const hoyStr = new Date().toISOString().split('T')[0];

  return (
    <div style={styles.page}>
      <Tokens />

      {loading && (
        <div style={styles.card}>
          <div style={styles.centerState}>
            <div style={styles.spinner} />
            <p style={styles.mutedText}>Verificando enlace de agendamiento…</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div style={styles.card}>
          <div style={styles.centerState}>
            <div style={{ ...styles.stateIcon, background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <IconAlert size={26} />
            </div>
            <h2 style={styles.stateTitle}>Acceso inválido</h2>
            <p style={styles.mutedText}>{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && confirmado && (
        <div style={styles.card}>
          <div style={styles.centerState}>
            <div style={{ ...styles.stateIcon, background: 'var(--ok-soft)', color: 'var(--ok)' }}>
              <IconCheck size={28} />
            </div>
            <h2 style={styles.stateTitle}>Turno solicitado con éxito</h2>
            <p style={styles.mutedText}>
              Registramos tu solicitud de entrega para la Orden de Compra <strong>{oc?.numero_oc}</strong>.
            </p>
          </div>

          <div style={styles.summaryBox}>
            <ResumenItem icon={<IconCalendar size={16} />} label="Fecha" value={fechaTurno} />
            <ResumenItem icon={<IconClock size={16} />} label="Hora estimada" value={`${horaInicio} hs`} />
            <ResumenItem icon={<IconTruck size={16} />} label="Patente" value={patenteVehiculo.toUpperCase()} />
            {datosChofer && <ResumenItem icon={<IconUser size={16} />} label="Chofer" value={datosChofer} />}
          </div>

          <p style={{ ...styles.mutedText, fontSize: 13, marginTop: 20 }}>
            El equipo de depósito confirmará la recepción a la brevedad. Podés cerrar esta ventana.
          </p>
        </div>
      )}

      {!loading && !error && !confirmado && (
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.brandRow}>
              <div style={styles.brandMark}>
                <IconTruck size={20} />
              </div>
              <span style={styles.kicker}>Portal de Proveedores</span>
            </div>
            <h1 style={styles.title}>Agendar turno de entrega</h1>
            <p style={styles.mutedText}>
              Proveedor: <strong style={{ color: 'var(--ink)' }}>{proveedor?.nombre}</strong>
            </p>
          </div>

          {/* Resumen de la Orden de Compra */}
          <div style={styles.ocBox}>
            <div style={styles.ocHead}>
              <span style={styles.ocNumber}>
                <IconPackage size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                OC {oc?.numero_oc}
              </span>
              <span style={styles.ocLimit}>
                <IconClock size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                Entrega límite: {oc?.fecha_limite_entrega || 'No especificada'}
              </span>
            </div>

            <p style={styles.ocSubtitle}>Detalle de insumos solicitados</p>
            <ul style={styles.ocList}>
              {oc?.orden_compra_items?.map((item) => (
                <li key={item.id} style={styles.ocListItem}>
                  <span style={styles.sku}>{item.productos?.sku}</span>
                  {' '}{item.productos?.descripcion}
                  <span style={styles.qty}>
                    {item.cantidad_solicitada} {item.productos?.unidad_medida || 'UNIDADES'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mensaje de advertencia si elige una fecha no permitida */}
          {advertenciaFecha && (
            <div style={styles.warning}>
              <IconAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{advertenciaFecha}</span>
            </div>
          )}

          {/* Formulario de Agendamiento */}
          <form onSubmit={handleSubmit}>
            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Fecha de entrega *</label>
                <input
                  type="date"
                  min={hoyStr}
                  max={oc?.fecha_limite_entrega || undefined}
                  value={fechaTurno}
                  onChange={handleFechaChange}
                  required
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Horario estimado *</label>
                <select
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  required
                  style={{ ...styles.input, opacity: fechaTurno ? 1 : 0.55 }}
                  disabled={!fechaTurno}
                >
                  {opcionesHoras.map((hora) => (
                    <option key={hora} value={hora}>{hora} hs</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={styles.label}>Patente del vehículo / camión *</label>
              <input
                type="text"
                placeholder="Ej: AA123CD o AB123CD"
                value={patenteVehiculo}
                onChange={(e) => setPatenteVehiculo(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={styles.label}>Nombre y DNI del chofer (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Juan Pérez - DNI 35.123.456"
                value={datosChofer}
                onChange={(e) => setDatosChofer(e.target.value)}
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={submitting || !fechaTurno} style={{
              ...styles.button,
              opacity: (submitting || !fechaTurno) ? 0.6 : 1,
              cursor: (submitting || !fechaTurno) ? 'not-allowed' : 'pointer'
            }}>
              <IconCalendar size={18} />
              {submitting ? 'Reservando turno…' : 'Confirmar y agendar turno'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ResumenItem({ icon, label, value }) {
  return (
    <div style={styles.resumenItem}>
      <span style={styles.resumenIcon}>{icon}</span>
      <span style={styles.resumenLabel}>{label}</span>
      <span style={styles.resumenValue}>{value}</span>
    </div>
  );
}

// Tokens de estilo + fuente, inyectados una sola vez (pagina publica independiente)
function Tokens() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      :root {
        --ink: #211c17;
        --ink-2: #4a4038;
        --muted: #8c8172;
        --line: #e6ded0;
        --paper: #f5f0e6;
        --card: #fffdf9;
        --accent: #c2660a;
        --accent-soft: #f6e6d0;
        --ok: #3f6b1f;
        --ok-soft: #e9ecdd;
        --danger: #9c2b1f;
        --danger-soft: #f3e0da;
        --warn: #9a4508;
        --warn-soft: #f6e6d0;
      }
      .agendar-spin { animation: agendarSpin 0.8s linear infinite; }
      @keyframes agendarSpin { to { transform: rotate(360deg); } }
    `}</style>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--paper)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '48px 16px',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--ink)'
  },
  card: {
    background: 'var(--card)',
    borderRadius: 7,
    maxWidth: 580,
    width: '100%',
    padding: 32,
    border: '1px solid var(--line)',
    boxShadow: '0 1px 2px rgba(26,29,36,0.04), 0 24px 48px -24px rgba(26,29,36,0.18)'
  },
  header: { borderBottom: '1px solid var(--line)', paddingBottom: 20, marginBottom: 22 },
  brandRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  brandMark: {
    width: 40, height: 40, borderRadius: 7,
    background: 'var(--ink)', color: 'var(--paper)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  kicker: {
    fontSize: 11, fontWeight: 700, color: 'var(--accent)',
    textTransform: 'uppercase', letterSpacing: '1px'
  },
  title: { margin: '0 0 6px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' },
  mutedText: { margin: 0, color: 'var(--muted)', fontSize: 14, lineHeight: 1.5 },

  ocBox: {
    background: 'var(--paper)', border: '1px solid var(--line)',
    borderRadius: 8, padding: 16, marginBottom: 20
  },
  ocHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 10, flexWrap: 'wrap', marginBottom: 12
  },
  ocNumber: { fontWeight: 700, fontSize: 15, color: 'var(--ink)' },
  ocLimit: {
    fontSize: 12, fontWeight: 600, color: 'var(--danger)',
    background: 'var(--danger-soft)', padding: '4px 10px', borderRadius: 4
  },
  ocSubtitle: {
    margin: '0 0 8px', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)'
  },
  ocList: { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 },
  ocListItem: {
    fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5,
    paddingLeft: 12, borderLeft: '2px solid var(--accent)'
  },
  sku: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontWeight: 700, color: 'var(--ink)', fontSize: 12
  },
  qty: { color: 'var(--muted)', fontWeight: 600, marginLeft: 4 },

  warning: {
    display: 'flex', gap: 8, alignItems: 'flex-start',
    padding: '12px 14px', background: 'var(--warn-soft)', color: 'var(--warn)',
    borderRadius: 7, marginBottom: 18, fontSize: 13, fontWeight: 600, lineHeight: 1.45
  },

  grid2: { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 },
  input: {
    width: '100%', padding: '11px 12px', borderRadius: 6,
    border: '1px solid var(--line)', fontSize: 14, boxSizing: 'border-box',
    fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', outline: 'none'
  },
  button: {
    width: '100%', padding: '13px', borderRadius: 7, border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700,
    fontFamily: 'inherit', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8
  },

  centerState: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '12px 0' },
  stateIcon: { width: 56, height: 56, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  stateTitle: { margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' },
  spinner: {
    width: 32, height: 32, borderRadius: '50%',
    border: '3px solid var(--line)', borderTopColor: 'var(--accent)',
    animation: 'agendarSpin 0.8s linear infinite'
  },

  summaryBox: {
    background: 'var(--paper)', padding: 16, borderRadius: 8,
    border: '1px solid var(--line)', display: 'grid', gap: 10, marginTop: 20
  },
  resumenItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 },
  resumenIcon: { color: 'var(--accent)', display: 'flex' },
  resumenLabel: { color: 'var(--muted)', fontWeight: 600, minWidth: 96 },
  resumenValue: { color: 'var(--ink)', fontWeight: 700 }
};
