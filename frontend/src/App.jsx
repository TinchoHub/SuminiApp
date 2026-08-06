// frontend/src/App.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase, getOrdenesCompra, confirmarTurno } from './services/api';
import { Login } from './components/Login';
import { EstadoBadge } from './components/EstadoBadge';
import { ModalNuevaOC } from './components/ModalNuevaOC';
import { ModalRecepcion } from './components/ModalRecepcion';
import { ModalEditarOC } from './components/ModalEditarOC';
import { VistaCalendario } from './components/VistaCalendario';
import { ConfigDisponibilidad } from './components/ConfigDisponibilidad';
import { GestionCatalogos } from './components/GestionCatalogos';
import { UsuariosABM } from './components/UsuariosABM';

const OPCIONES_ESTADO = [
  { value: 'PENDIENTE_TURNO', label: '⏳ Pendiente Turno' },
  { value: 'TURNO_SOLICITADO', label: '📅 Turno Solicitado' },
  { value: 'TURNO_CONFIRMADO', label: '✅ Turno Confirmado' },
  { value: 'ENTREGADO_PARCIAL', label: '🟡 Entregado Parcial' },
  { value: 'ENTREGADO_TOTAL', label: '📦 Entregado Total' }
];

export default function App() {
  // --- ESTADOS DE SESIÓN Y AUTENTICACIÓN ---
  const [session, setSession] = useState(null);
  const [userPerfil, setUserPerfil] = useState(null);
  const [permisos, setPermisos] = useState([]); // Lista de módulo_id permitidos
  const [checkingAuth, setCheckingAuth] = useState(true);

  // --- ESTADO DE NAVEGACIÓN ---
  const [activeTab, setActiveTab] = useState('ORDENES');

  // --- DATOS Y FILTROS ---
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(
    OPCIONES_ESTADO.map((o) => o.value)
  );
  const [sortField, setSortField] = useState('fecha_emision');
  const [sortDir, setSortDir] = useState('desc');

  // --- MODALES ---
  const [isModalNuevaOpen, setIsModalNuevaOpen] = useState(false);
  const [selectedOcRecepcion, setSelectedOcRecepcion] = useState(null);
  const [selectedOcEditar, setSelectedOcEditar] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Helper para verificar si el usuario tiene un permiso específico
 const tienePermiso = (moduloId) => {
  if (userPerfil?.rol?.toUpperCase() === 'ADMIN') return true;
  return permisos.includes(moduloId);
};

// Cargar Perfil y sus Permisos desde la DB
const cargarPerfilYPermisos = async (userId) => {
  try {
    // 1. Obtener Perfil del usuario
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('nombre, rol')
      .eq('id', userId)
      .maybeSingle();

    if (perfilError) {
      console.warn('Error leyendo el perfil del usuario:', perfilError.message);
    }

    if (!perfil) {
      // Si no se pudo leer el perfil, no asumimos ADMIN ni ningún otro rol:
      // dejamos al usuario sin permisos y avisamos, en vez de darle acceso por error.
      setUserPerfil(null);
      setPermisos([]);
      setError('No se pudo cargar tu perfil de usuario. Recargá la página o contactá a un administrador.');
      return;
    }

    setUserPerfil(perfil);
    const rolActual = perfil.rol;

    // 2. Si es ADMIN, asignamos acceso total sin necesidad de consultar la DB
    if (rolActual.toUpperCase() === 'ADMIN') {
      setPermisos([
        'ORDENES_VER', 'ORDENES_CREAR', 'TURNO_CONFIRMAR', 
        'RECEPCION_MERCADERIA', 'CATALOGOS_GESTION', 
        'CONFIGURACION_CUPOS', 'USUARIOS_ABM', 'REPORTES_VER'
      ]);
      return;
    }

    // 3. Consultar permisos para otros roles
    const { data: listaPermisos, error: permError } = await supabase
      .from('rol_permisos')
      .select('modulo_id')
      .eq('rol_id', rolActual);

    if (!permError && listaPermisos) {
      setPermisos(listaPermisos.map((p) => p.modulo_id));
    } else {
      console.warn('No se pudieron cargar permisos dinámicos:', permError);
      setPermisos([]);
    }
  } catch (err) {
    console.error('Error al cargar perfil y permisos:', err);
  }
};

  // 1. Verificar Sesión al iniciar la App
  useEffect(() => {
    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          await cargarPerfilYPermisos(data.session.user.id);
        }
      } catch (err) {
        console.error('Error al verificar sesión:', err);
      } finally {
        setCheckingAuth(false);
      }
    }

    loadSession();

    // Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await cargarPerfilYPermisos(newSession.user.id);
      } else {
        setUserPerfil(null);
        setPermisos([]);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Cargar Órdenes de Compra
  const fetchOrdenes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOrdenesCompra();
      if (res.ok) {
        setOrdenes(res.data);
      } else {
        setError('Error al obtener la información.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchOrdenes();
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserPerfil(null);
    setPermisos([]);
  };

  // Ordenación y filtrado
  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const ordenesFiltradasYOrdenadas = useMemo(() => {
    const filtradas = ordenes.filter((oc) => {
      const estadoActual = oc.estado === 'ENTREGADO' ? 'ENTREGADO_TOTAL' : oc.estado;
      if (!estadosSeleccionados.includes(estadoActual)) return false;

      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const numeroOcMatch = oc.numero_oc?.toLowerCase().includes(query);
        const proveedorMatch = oc.proveedores?.nombre?.toLowerCase().includes(query);
        const skuMatch = oc.orden_compra_items?.some(
          (item) =>
            item.productos?.sku?.toLowerCase().includes(query) ||
            item.productos?.descripcion?.toLowerCase().includes(query)
        );

        return numeroOcMatch || proveedorMatch || skuMatch;
      }

      return true;
    });

    return filtradas.sort((a, b) => {
      let valA = a[sortField] || a.created_at?.split('T')[0] || '';
      let valB = b[sortField] || b.created_at?.split('T')[0] || '';

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [ordenes, estadosSeleccionados, searchTerm, sortField, sortDir]);

  const handleCopyLink = (oc) => {
    const token = oc.proveedores?.token_acceso;
    if (!token) {
      alert('Este proveedor no tiene un token de acceso válido.');
      return;
    }

    const link = `${window.location.origin}/agendar/${token}?oc=${oc.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(oc.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleConfirmarTurno = async (ocId) => {
    try {
      const res = await confirmarTurno(ocId);
      if (res.ok) fetchOrdenes();
    } catch (err) {
      alert('Error al confirmar el turno.');
    }
  };

  // --- VISTA 1: CARGANDO ---
  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Cargando aplicación...</p>
      </div>
    );
  }

  // --- VISTA 2: SI NO HAY SESIÓN, MOSTRAR LOGIN ---
  if (!session) {
    return <Login onLoginSuccess={(sess, perf) => { setSession(sess); setUserPerfil(perf); }} />;
  }

  const rol = userPerfil?.rol || 'DEPOSITO';

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '30px', maxWidth: '1250px', margin: '0 auto' }}>
      {/* ENCABEZADO */}
      <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#111827', fontSize: '28px' }}>📦 Control de Depósito</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
            Usuario: <strong>{userPerfil?.nombre || session.user.email}</strong> | Rol: <span style={{ fontWeight: '700', color: '#2563eb' }}>{rol}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {tienePermiso('ORDENES_CREAR') && activeTab === 'ORDENES' && (
            <button
              onClick={() => setIsModalNuevaOpen(true)}
              style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              ➕ Nueva OC
            </button>
          )}

          <button
            onClick={fetchOrdenes}
            style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            🔄 Actualizar
          </button>

          <button
            onClick={handleLogout}
            style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            🚪 Salir
          </button>
        </div>
      </header>

      {/* MENÚ DE PESTAÑAS (FILTRADO DINÁMICO POR PERMISOS) */}
      <nav style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
        {tienePermiso('ORDENES_VER') && (
          <button
            onClick={() => setActiveTab('ORDENES')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'ORDENES' ? '3px solid #2563eb' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'ORDENES' ? '#2563eb' : '#6b7280',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            📋 Órdenes de Compra
          </button>
        )}

        {tienePermiso('ORDENES_VER') && (
          <button
            onClick={() => setActiveTab('CALENDARIO')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'CALENDARIO' ? '3px solid #2563eb' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'CALENDARIO' ? '#2563eb' : '#6b7280',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            📅 Calendario de Turnos
          </button>
        )}

        {tienePermiso('CATALOGOS_GESTION') && (
          <button
            onClick={() => setActiveTab('CATALOGOS')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'CATALOGOS' ? '3px solid #2563eb' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'CATALOGOS' ? '#2563eb' : '#6b7280',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            🗂️ Catálogos
          </button>
        )}

        {tienePermiso('CONFIGURACION_CUPOS') && (
          <button
            onClick={() => setActiveTab('CONFIGURACION')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'CONFIGURACION' ? '3px solid #2563eb' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'CONFIGURACION' ? '#2563eb' : '#6b7280',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            ⚙️ Horarios y Cupos
          </button>
        )}

        {tienePermiso('USUARIOS_ABM') && (
          <button
            onClick={() => setActiveTab('USUARIOS')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'USUARIOS' ? '3px solid #2563eb' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'USUARIOS' ? '#2563eb' : '#6b7280',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            👥 Usuarios
          </button>
        )}
      </nav>

      {/* PESTAÑA 1: ÓRDENES DE COMPRA */}
      {activeTab === 'ORDENES' && tienePermiso('ORDENES_VER') && (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar por N° OC, Proveedor o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>
              Mostrando <strong>{ordenesFiltradasYOrdenadas.length}</strong> de <strong>{ordenes.length}</strong> OCs
            </div>
          </div>

          {loading && <p style={{ color: '#4b5563' }}>Cargando Órdenes de Compra...</p>}
          {error && <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

          {!loading && !error && (
            <div style={{ overflowX: 'auto', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>N° OC</th>
                    <th onClick={() => handleSortChange('fecha_emision')} style={{ padding: '12px 16px', cursor: 'pointer' }}>
                      Emisión {sortField === 'fecha_emision' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </th>
                    <th onClick={() => handleSortChange('fecha_limite_entrega')} style={{ padding: '12px 16px', cursor: 'pointer' }}>
                      Límite {sortField === 'fecha_limite_entrega' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </th>
                    <th style={{ padding: '12px 16px' }}>Proveedor</th>
                    <th style={{ padding: '12px 16px' }}>Insumos / Progreso</th>
                    <th style={{ padding: '12px 16px' }}>Turno Asignado</th>
                    <th style={{ padding: '12px 16px' }}>Estado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesFiltradasYOrdenadas.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                        No se encontraron Órdenes de Compra.
                      </td>
                    </tr>
                  ) : (
                    ordenesFiltradasYOrdenadas.map((oc) => {
                      let turno = null;
                      if (Array.isArray(oc.turnos) && oc.turnos.length > 0) {
                        turno = oc.turnos[oc.turnos.length - 1];
                      } else if (oc.turnos && typeof oc.turnos === 'object' && !Array.isArray(oc.turnos)) {
                        turno = oc.turnos;
                      }

                      const items = oc.orden_compra_items || [];
                      const fEmision = oc.fecha_emision || oc.created_at?.split('T')[0] || 'N/A';

                      return (
                        <tr key={oc.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '14px', verticalAlign: 'top' }}>
                          <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1f2937' }}>{oc.numero_oc}</td>
                          <td style={{ padding: '14px 16px', color: '#4b5563', whiteSpace: 'nowrap' }}>📅 {fEmision}</td>
                          <td style={{ padding: '14px 16px', color: '#dc2626', fontWeight: '600', whiteSpace: 'nowrap' }}>⏰ {oc.fecha_limite_entrega}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <div>{oc.proveedores?.nombre || 'Sin Proveedor'}</div>
                            <small style={{ color: '#6b7280' }}>{oc.proveedores?.email_contacto}</small>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {items.map((item) => (
                              <div key={item.id} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', gap: '8px', borderBottom: '1px dashed #e5e7eb' }}>
                                <span>{item.productos?.sku}:</span>
                                <strong>{item.cantidad_recibida || 0} / {item.cantidad_solicitada}</strong>
                              </div>
                            ))}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {turno ? <div><strong>📅 {turno.fecha_turno}</strong> ({turno.hora_inicio?.slice(0, 5)} hs)</div> : <span style={{ color: '#9ca3af' }}>Sin agendar</span>}
                          </td>
                          <td style={{ padding: '14px 16px' }}><EstadoBadge estado={oc.estado} /></td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              {tienePermiso('ORDENES_CREAR') && (
                                <>
                                  <button onClick={() => setSelectedOcEditar(oc)} style={btnStyle}>✏️ Editar</button>
                                  <button onClick={() => handleCopyLink(oc)} style={btnStyle}>{copiedId === oc.id ? '✓ Copiado' : '🔗 Link'}</button>
                                </>
                              )}

                              {oc.estado === 'TURNO_SOLICITADO' && tienePermiso('TURNO_CONFIRMAR') && (
                                <button onClick={() => handleConfirmarTurno(oc.id)} style={{ ...btnStyle, backgroundColor: '#2563eb', color: '#ffffff' }}>✅ Confirmar</button>
                              )}

                              {(oc.estado === 'TURNO_CONFIRMADO' || oc.estado === 'ENTREGADO_PARCIAL') && tienePermiso('RECEPCION_MERCADERIA') && (
                                <button onClick={() => setSelectedOcRecepcion(oc)} style={{ ...btnStyle, backgroundColor: '#16a34a', color: '#ffffff' }}>📦 Recibir</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* PESTAÑA 2: CALENDARIO */}
      {activeTab === 'CALENDARIO' && tienePermiso('ORDENES_VER') && <VistaCalendario />}

      {/* PESTAÑA 3: CATÁLOGOS */}
      {activeTab === 'CATALOGOS' && tienePermiso('CATALOGOS_GESTION') && <GestionCatalogos />}

      {/* PESTAÑA 4: CONFIGURACIÓN DE HORARIOS Y CUPOS */}
      {activeTab === 'CONFIGURACION' && tienePermiso('CONFIGURACION_CUPOS') && <ConfigDisponibilidad />}

      {/* PESTAÑA 5: GESTIÓN DE USUARIOS */}
      {activeTab === 'USUARIOS' && tienePermiso('USUARIOS_ABM') && <UsuariosABM />}

      {/* MODALES */}
      <ModalNuevaOC isOpen={isModalNuevaOpen} onClose={() => setIsModalNuevaOpen(false)} onOCCreated={fetchOrdenes} />
      <ModalRecepcion isOpen={!!selectedOcRecepcion} oc={selectedOcRecepcion} onClose={() => setSelectedOcRecepcion(null)} onRecepcionSuccess={fetchOrdenes} />
      <ModalEditarOC isOpen={!!selectedOcEditar} oc={selectedOcEditar} onClose={() => setSelectedOcEditar(null)} onOCUpdated={fetchOrdenes} />
    </div>
  );
}

const btnStyle = { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' };