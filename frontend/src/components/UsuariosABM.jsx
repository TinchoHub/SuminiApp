import React, { useState, useEffect } from 'react';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getRolesYPermisos, createRol, updatePermisosRol } from '../services/api';

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

  if (loading) return <p>Cargando administración de acceso...</p>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* NAVEGACIÓN SECUNDARIA */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <button
          onClick={() => setSubTab('USUARIOS')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: subTab === 'USUARIOS' ? '#2563eb' : '#e5e7eb', color: subTab === 'USUARIOS' ? '#fff' : '#374151' }}
        >
          👤 Usuarios
        </button>
        <button
          onClick={() => setSubTab('ROLES')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: subTab === 'ROLES' ? '#2563eb' : '#e5e7eb', color: subTab === 'ROLES' ? '#fff' : '#374151' }}
        >
          🔐 Roles y Permisos
        </button>
      </div>

      {mensaje && <div style={{ padding: '10px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '16px' }}>✅ {mensaje}</div>}
      {error && <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px' }}>⚠️ {error}</div>}

      {/* SECCIÓN 1: USUARIOS */}
      {subTab === 'USUARIOS' && (
        <div>
          <form onSubmit={handleGuardarUsuario} style={cardStyle}>
            <h3>{editUserId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
            <div style={{ marginTop: '16px' }}>
              <button type="submit" style={btnPrimary}>{editUserId ? 'Guardar Cambios' : 'Registrar Usuario'}</button>
              {editUserId && <button type="button" onClick={resetUserForm} style={btnSecondary}>Cancelar</button>}
            </div>
          </form>

          <h3>Usuarios Registrados</h3>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={tdStyle}>Nombre</th>
                <th style={tdStyle}>Rol</th>
                <th style={tdStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{u.nombre}</td>
                  <td style={tdStyle}><strong>{u.rol}</strong></td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEditUser(u)} style={{ marginRight: '8px', cursor: 'pointer' }}>✏️ Editar</button>
                    <button onClick={() => handleDeleteUser(u.id)} style={{ cursor: 'pointer', color: 'red' }}>🗑️ Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECCIÓN 2: ROLES Y PERMISOS */}
      {subTab === 'ROLES' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Formulario Crear Rol */}
          <div>
            <form onSubmit={handleCrearRol} style={cardStyle}>
              <h3>➕ Crear Nuevo Rol</h3>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Identificador (ID Único)</label>
                <input type="text" placeholder="EJ: SUPERVISOR" value={rId} onChange={(e) => setRId(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Nombre del Rol</label>
                <input type="text" placeholder="Ej: Supervisor de Turnos" value={rNombre} onChange={(e) => setRNombre(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Descripción</label>
                <input type="text" value={rDesc} onChange={(e) => setRDesc(e.target.value)} style={inputStyle} />
              </div>

              <label style={labelStyle}>Asignar Permisos Iniciales:</label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '8px', borderRadius: '4px', background: '#fff' }}>
                {modulos.map((m) => (
                  <label key={m.id} style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>
                    <input
                      type="checkbox"
                      checked={rModulosSeleccionados.includes(m.id)}
                      onChange={() => handleToggleModuloNuevoRol(m.id)}
                    />{' '}
                    <strong>{m.nombre}</strong> <span style={{ color: '#888' }}>({m.categoria})</span>
                  </label>
                ))}
              </div>

              <button type="submit" style={{ ...btnPrimary, marginTop: '14px', width: '100%' }}>Guardar Nuevo Rol</button>
            </form>
          </div>

          {/* Editor de Permisos por Rol */}
          <div style={cardStyle}>
            <h3>🛠️ Editar Permisos de Rol</h3>
            <p style={{ fontSize: '13px', color: '#666' }}>Selecciona un rol para modificar sus accesos:</p>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSeleccionarRolEdicion(r)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    cursor: 'pointer',
                    background: rolEdicion?.id === r.id ? '#2563eb' : '#fff',
                    color: rolEdicion?.id === r.id ? '#fff' : '#000',
                    fontWeight: 'bold'
                  }}
                >
                  {r.nombre}
                </button>
              ))}
            </div>

            {rolEdicion ? (
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>Permisos para: <span style={{ color: '#2563eb' }}>{rolEdicion.nombre}</span></h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {modulos.map((m) => (
                    <label key={m.id} style={{ fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={permisosEditando.includes(m.id)}
                        onChange={() => handleTogglePermisoEditando(m.id)}
                      />
                      <span><strong>{m.nombre}</strong> <small style={{ color: '#666' }}>[{m.categoria}]</small></span>
                    </label>
                  ))}
                </div>
                <button onClick={handleGuardarPermisosRol} style={btnPrimary}>
                  💾 Actualizar Permisos de {rolEdicion.id}
                </button>
              </div>
            ) : (
              <p style={{ color: '#888', fontStyle: 'italic' }}>Haz clic en uno de los roles superiores para editar sus permisos.</p>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

// Estilos
const cardStyle = { background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#374151' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '10px' };
const tdStyle = { padding: '10px', borderBottom: '1px solid #eee' };
const btnPrimary = { padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnSecondary = { padding: '8px 16px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '8px' };