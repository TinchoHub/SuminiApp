import React, { useState, useEffect } from 'react';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getRolesYPermisos, createRol, updatePermisosRol } from '../services/api';
import { IconUser, IconShield, IconEdit, IconTrash, IconPlus, IconSave, IconCheck, IconAlert } from './Icon';

export function UsuariosABM() {
  const [subTab, setSubTab] = useState('USUARIOS'); // 'USUARIOS' | 'ROLES'
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Estados de Usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [editUserId, setEditUserId] = useState(null);
  const [uNombre, setUNombre] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRol, setURol] = useState('OPERADOR');

  // Estados de Roles y Permisos
  const [roles, setRoles] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [permisosMatriz, setPermisosMatriz] = useState([]); // [{ rol_id, modulo_id }]

  // Form de Nuevo Rol
  const [rId, setRId] = useState('');
  const [rNombre, setRNombre] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rModulosSeleccionados, setRModulosSeleccionados] = useState([]);

  // Rol seleccionado para editar sus permisos
  const [rolEdicion, setRolEdicion] = useState(null);
  const [permisosEditando, setPermisosEditando] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

 const cargarDatos = async () => {
  setLoading(true);
  setError('');
  try {
    const [resUsers, resRoles] = await Promise.all([
      getUsuarios(),
      getRolesYPermisos()
    ]);

    if (resUsers?.ok) {
      setUsuarios(resUsers.data || []);
    }

    if (resRoles?.ok && resRoles.data) {
      const { roles: listaRoles, modulos: listaModulos, permisos: listaPermisos } = resRoles.data;
      
      setRoles(listaRoles || []);
      setModulos(listaModulos || []);
      setPermisosMatriz(listaPermisos || []);

      if (listaRoles && listaRoles.length > 0) {
        setURol(listaRoles[0].id);
      }
    }
  } catch (err) {
    console.error('Error cargando Usuarios/Roles:', err);
    // Mostrar el mensaje explícito enviado por Express si existe
    const msjError = err.response?.data?.error || 'Error al conectar con el servidor de usuarios y roles.';
    setError(msjError);
  } finally {
    setLoading(false);
  }
};

  // --- HANDLERS USUARIOS ---
  const handleGuardarUsuario = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      if (editUserId) {
        await updateUsuario(editUserId, { nombre: uNombre, rol: uRol });
        setMensaje('Usuario actualizado con éxito');
      } else {
        await createUsuario({ email: uEmail, password: uPassword, nombre: uNombre, rol: uRol });
        setMensaje('Usuario creado con éxito');
      }
      resetUserForm();
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const handleEditUser = (user) => {
    setEditUserId(user.id);
    setUNombre(user.nombre);
    setURol(user.rol);
    setUEmail('');
    setUPassword('');
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Eliminar usuario?')) return;
    try {
      await deleteUsuario(id);
      setMensaje('Usuario eliminado');
      cargarDatos();
    } catch (err) {
      setError('Error al eliminar usuario');
    }
  };

  const resetUserForm = () => {
    setEditUserId(null);
    setUNombre('');
    setUEmail('');
    setUPassword('');
  };

  // --- HANDLERS ROLES ---
  const handleCrearRol = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      await createRol({ id: rId, nombre: rNombre, descripcion: rDesc, modulos: rModulosSeleccionados });
      setMensaje('Nuevo rol creado con éxito');
      setRId(''); setRNombre(''); setRDesc(''); setRModulosSeleccionados([]);
      cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear rol');
    }
  };

  const handleToggleModuloNuevoRol = (mId) => {
    setRModulosSeleccionados((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  const handleSeleccionarRolEdicion = (rol) => {
    setRolEdicion(rol);
    const modulosDelRol = permisosMatriz
      .filter((p) => p.rol_id === rol.id)
      .map((p) => p.modulo_id);
    setPermisosEditando(modulosDelRol);
  };

  const handleTogglePermisoEditando = (mId) => {
    setPermisosEditando((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  const handleGuardarPermisosRol = async () => {
    if (!rolEdicion) return;
    try {
      await updatePermisosRol(rolEdicion.id, permisosEditando);
      setMensaje(`Permisos actualizados para el rol ${rolEdicion.nombre}`);
      cargarDatos();
    } catch (err) {
      setError('Error al actualizar permisos');
    }
  };

  if (loading) return <p style={{ color: '#8c8172', fontFamily: FONT }}>Cargando administración de acceso...</p>;

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', fontFamily: FONT }}>

      {/* NAVEGACIÓN SECUNDARIA */}
      <div style={subTabsStyle}>
        <button
          onClick={() => setSubTab('USUARIOS')}
          style={subTab === 'USUARIOS' ? subTabActiveStyle : subTabStyle}
        >
          <IconUser size={16} /> Usuarios
        </button>
        <button
          onClick={() => setSubTab('ROLES')}
          style={subTab === 'ROLES' ? subTabActiveStyle : subTabStyle}
        >
          <IconShield size={16} /> Roles y Permisos
        </button>
      </div>

      {mensaje && <div style={alertSuccessStyle}><IconCheck size={16} /><span>{mensaje}</span></div>}
      {error && <div style={alertErrorStyle}><IconAlert size={16} /><span>{error}</span></div>}

      {/* SECCIÓN 1: USUARIOS */}
      {subTab === 'USUARIOS' && (
        <div>
          <form onSubmit={handleGuardarUsuario} style={cardStyle}>
            <h3 style={formTitleStyle}>
              {editUserId ? <><IconEdit size={16} /> Editar Usuario</> : <><IconPlus size={16} /> Crear Nuevo Usuario</>}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre Completo</label>
                <input type="text" value={uNombre} onChange={(e) => setUNombre(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Rol Asignado</label>
                <select value={uRol} onChange={(e) => setURol(e.target.value)} style={inputStyle}>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre} ({r.id})</option>
                  ))}
                </select>
              </div>
              {!editUserId && (
                <>
                  <div>
                    <label style={labelStyle}>Correo Electrónico</label>
                    <input type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Contraseña</label>
                    <input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} required style={inputStyle} />
                  </div>
                </>
              )}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={btnPrimary}>{editUserId ? 'Guardar Cambios' : 'Registrar Usuario'}</button>
              {editUserId && <button type="button" onClick={resetUserForm} style={btnSecondary}>Cancelar</button>}
            </div>
          </form>

          <h3 style={sectionHeadingStyle}>Usuarios Registrados</h3>
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Rol</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} style={trStyle}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#211c17' }}>{u.nombre}</td>
                    <td style={tdStyle}><span style={rolChipStyle}>{u.rol}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button onClick={() => handleEditUser(u)} style={btnAction} title="Editar">
                          <IconEdit size={15} />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} style={btnActionDanger} title="Eliminar">
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: ROLES Y PERMISOS */}
      {subTab === 'ROLES' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'start' }}>

          {/* Formulario Crear Rol */}
          <div>
            <form onSubmit={handleCrearRol} style={cardStyle}>
              <h3 style={formTitleStyle}><IconPlus size={16} /> Crear Nuevo Rol</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Identificador (ID Único)</label>
                <input type="text" placeholder="EJ: SUPERVISOR" value={rId} onChange={(e) => setRId(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Nombre del Rol</label>
                <input type="text" placeholder="Ej: Supervisor de Turnos" value={rNombre} onChange={(e) => setRNombre(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Descripción</label>
                <input type="text" value={rDesc} onChange={(e) => setRDesc(e.target.value)} style={inputStyle} />
              </div>

              <label style={labelStyle}>Asignar Permisos Iniciales:</label>
              <div style={checkListStyle}>
                {modulos.map((m) => (
                  <label key={m.id} style={checkItemStyle}>
                    <input
                      type="checkbox"
                      checked={rModulosSeleccionados.includes(m.id)}
                      onChange={() => handleToggleModuloNuevoRol(m.id)}
                      style={{ accentColor: '#c2660a' }}
                    />
                    <span><strong style={{ color: '#211c17' }}>{m.nombre}</strong> <span style={{ color: '#a89d8a' }}>({m.categoria})</span></span>
                  </label>
                ))}
              </div>

              <button type="submit" style={{ ...btnPrimary, marginTop: '14px', width: '100%', justifyContent: 'center' }}>Guardar Nuevo Rol</button>
            </form>
          </div>

          {/* Editor de Permisos por Rol */}
          <div style={cardStyle}>
            <h3 style={formTitleStyle}><IconShield size={16} /> Editar Permisos de Rol</h3>
            <p style={{ fontSize: '13px', color: '#8c8172', marginTop: 0 }}>Seleccioná un rol para modificar sus accesos:</p>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSeleccionarRolEdicion(r)}
                  style={rolEdicion?.id === r.id ? rolPillActive : rolPill}
                >
                  {r.nombre}
                </button>
              ))}
            </div>

            {rolEdicion ? (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4a4038' }}>
                  Permisos para: <span style={{ color: '#9a4508', fontWeight: 700 }}>{rolEdicion.nombre}</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '16px' }}>
                  {modulos.map((m) => (
                    <label key={m.id} style={{ fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#4a4038' }}>
                      <input
                        type="checkbox"
                        checked={permisosEditando.includes(m.id)}
                        onChange={() => handleTogglePermisoEditando(m.id)}
                        style={{ accentColor: '#c2660a' }}
                      />
                      <span><strong style={{ color: '#211c17' }}>{m.nombre}</strong> <small style={{ color: '#8c8172' }}>[{m.categoria}]</small></span>
                    </label>
                  ))}
                </div>
                <button onClick={handleGuardarPermisosRol} style={btnPrimary}>
                  <IconSave size={15} /> Actualizar Permisos de {rolEdicion.id}
                </button>
              </div>
            ) : (
              <p style={{ color: '#a89d8a', fontStyle: 'italic', fontSize: '13px' }}>Hacé clic en uno de los roles superiores para editar sus permisos.</p>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

// Estilos
const FONT = "'Inter', system-ui, sans-serif";
const subTabsStyle = { display: 'flex', gap: '6px', marginBottom: '22px', background: '#fffdf9', border: '1px solid #e6ded0', borderRadius: '11px', padding: '6px', width: 'fit-content', boxShadow: '0 1px 2px rgba(16,18,22,0.05)' };
const subTabStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 14px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#8c8172', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer', fontFamily: FONT };
const subTabActiveStyle = { ...subTabStyle, backgroundColor: '#211c17', color: '#fffdf9' };
const cardStyle = { background: '#fffdf9', padding: '20px', borderRadius: '12px', border: '1px solid #e6ded0', marginBottom: '22px', boxShadow: '0 1px 2px rgba(16,18,22,0.05)' };
const formTitleStyle = { display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '16px', color: '#211c17', fontSize: '15px', fontWeight: 700 };
const sectionHeadingStyle = { fontSize: '15px', fontWeight: 700, color: '#211c17', margin: '0 0 12px' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px', color: '#4a4038' };
const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: '9px', border: '1px solid #e6ded0', boxSizing: 'border-box', fontSize: '14px', fontFamily: FONT, color: '#211c17', backgroundColor: '#fffdf9', outline: 'none' };
const tableContainerStyle = { backgroundColor: '#fffdf9', border: '1px solid #e6ded0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,18,22,0.05)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' };
const thStyle = { padding: '12px 16px', backgroundColor: '#f5f0e6', color: '#8c8172', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #e6ded0' };
const trStyle = { borderBottom: '1px solid #f1ebe0' };
const tdStyle = { padding: '13px 16px', color: '#4a4038' };
const rolChipStyle = { display: 'inline-block', padding: '3px 10px', borderRadius: '4px', backgroundColor: '#f1ebe0', color: '#4a4038', fontSize: '12px', fontWeight: 700 };
const checkListStyle = { maxHeight: '210px', overflowY: 'auto', border: '1px solid #e6ded0', padding: '10px', borderRadius: '9px', background: '#faf2e2' };
const checkItemStyle = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', cursor: 'pointer', color: '#4a4038' };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#211c17', color: '#fffdf9', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontFamily: FONT, fontSize: '14px' };
const btnSecondary = { padding: '10px 16px', backgroundColor: '#fffdf9', color: '#4a4038', border: '1px solid #e6ded0', borderRadius: '9px', cursor: 'pointer', fontWeight: 600, fontFamily: FONT, fontSize: '14px' };
const btnAction = { display: 'inline-grid', placeItems: 'center', width: '32px', height: '32px', backgroundColor: '#f1ebe0', border: '1px solid #e6ded0', borderRadius: '8px', cursor: 'pointer', color: '#4a4038' };
const btnActionDanger = { display: 'inline-grid', placeItems: 'center', width: '32px', height: '32px', backgroundColor: '#f3e0da', border: '1px solid #e6c4b8', borderRadius: '8px', cursor: 'pointer', color: '#9c2b1f' };
const rolPill = { padding: '7px 13px', borderRadius: '9px', border: '1px solid #e6ded0', cursor: 'pointer', background: '#fffdf9', color: '#4a4038', fontWeight: 600, fontSize: '13px', fontFamily: FONT };
const rolPillActive = { ...rolPill, background: '#211c17', color: '#fffdf9', borderColor: '#211c17' };
const alertSuccessStyle = { display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 16px', backgroundColor: '#e9ecdd', color: '#3f6b1f', border: '1px solid #d2d9c0', borderRadius: '10px', marginBottom: '16px', fontSize: '13.5px', fontWeight: 600 };
const alertErrorStyle = { display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 16px', backgroundColor: '#f3e0da', color: '#9c2b1f', border: '1px solid #e6c4b8', borderRadius: '10px', marginBottom: '16px', fontSize: '13.5px', fontWeight: 500 };
