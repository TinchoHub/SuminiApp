// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// =============================================================================
// INICIALIZACIÓN DE SUPABASE (Cliente Admin con Service Role Key)
// =============================================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('⚠️ Faltan variables de entorno de Supabase en el backend.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =============================================================================
// MIDDLEWARES DE AUTENTICACIÓN Y PERMISOS DINÁMICOS (RBAC)
// =============================================================================

// 1. Extraer usuario autenticado desde el Token Bearer de Supabase
const autenticarUsuario = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      const devRol = req.headers['x-user-rol'];
      if (devRol) {
        req.user = { rol: devRol };
        return next();
      }
      return res.status(401).json({ ok: false, error: 'No se proporcionó token de autenticación.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Token inválido o expirado.' });
    }

    // Obtener rol del perfil
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('nombre, rol')
      .eq('id', user.id)
      .single();

    req.user = { id: user.id, email: user.email, rol: perfil?.rol || 'DEPOSITO' };
    next();
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Error al verificar autenticación.' });
  }
};

// 2. Middleware dinámico que consulta los permisos del rol en 'rol_permisos'
const verificarPermiso = (moduloId) => {
  return async (req, res, next) => {
    try {
      const userRol = req.user?.rol;
      if (!userRol) {
        return res.status(403).json({ ok: false, error: 'Rol no especificado.' });
      }

      // Acceso directo si el rol es ADMIN (insensible a mayúsculas)
      if (userRol.toUpperCase() === 'ADMIN') {
        return next();
      }

      // CORRECCIÓN: Filtrar por 'rol_id' en lugar de 'rol'
      const { data, error } = await supabase
        .from('rol_permisos')
        .select('modulo_id')
        .eq('rol_id', userRol)
        .eq('modulo_id', moduloId)
        .maybeSingle();

      if (error || !data) {
        return res.status(403).json({ 
          ok: false, 
          error: `Acceso denegado. El rol '${userRol}' no tiene el permiso '${moduloId}'.` 
        });
      }

      next();
    } catch (err) {
      console.error('Error en verificarPermiso:', err);
      return res.status(500).json({ ok: false, error: 'Error interno al verificar permisos.' });
    }
  };
};

// =============================================================================
// RUTAS DE PROVEEDORES Y PRODUCTOS (CATÁLOGOS)
// =============================================================================

// PROVEEDORES
app.get('/api/proveedores', autenticarUsuario, verificarPermiso('CATALOGOS_GESTION'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('proveedores').select('*').order('nombre', { ascending: true });
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/proveedores', autenticarUsuario, verificarPermiso('CATALOGOS_GESTION'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('proveedores').insert([req.body]).select().single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/api/proveedores/:id', autenticarUsuario, verificarPermiso('CATALOGOS_GESTION'), async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('proveedores').update(req.body).eq('id', id).select().single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// PRODUCTOS
app.get('/api/productos', autenticarUsuario, verificarPermiso('CATALOGOS_GESTION'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('productos').select('*').order('sku', { ascending: true });
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/productos', autenticarUsuario, verificarPermiso('CATALOGOS_GESTION'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('productos').insert([req.body]).select().single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/api/productos/:id', autenticarUsuario, verificarPermiso('CATALOGOS_GESTION'), async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('productos').update(req.body).eq('id', id).select().single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// =============================================================================
// RUTAS DE ÓRDENES DE COMPRA
// =============================================================================

// OBTENER TODAS LAS ÓRDENES DE COMPRA
app.get('/api/ordenes-compra', autenticarUsuario, verificarPermiso('ORDENES_VER'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ordenes_compra')
      .select(`
        *,
        proveedores (id, nombre, email_contacto, token_acceso),
        orden_compra_items (id, cantidad_solicitada, cantidad_recibida, productos (id, sku, descripcion)),
        turnos (id, fecha_turno, hora_inicio, hora_fin, estado)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// OBTENER ÓRDEN DE COMPRA POR ID
app.get('/api/ordenes-compra/:id', autenticarUsuario, verificarPermiso('ORDENES_VER'), async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('ordenes_compra')
      .select(`
        *,
        proveedores (id, nombre, email_contacto, token_acceso),
        orden_compra_items (id, cantidad_solicitada, cantidad_recibida, productos (id, sku, descripcion)),
        turnos (id, fecha_turno, hora_inicio, hora_fin, estado)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// CREAR ÓRDEN DE COMPRA
app.post('/api/ordenes-compra', autenticarUsuario, verificarPermiso('ORDENES_CREAR'), async (req, res) => {
  try {
    const { numero_oc, proveedor_id, fecha_limite_entrega, items } = req.body;

    const { data: oc, error: errOc } = await supabase
      .from('ordenes_compra')
      .insert([{ numero_oc, proveedor_id, fecha_limite_entrega, estado: 'PENDIENTE_TURNO' }])
      .select()
      .single();

    if (errOc) throw errOc;

    if (items && items.length > 0) {
      const itemsFormatted = items.map((i) => ({
        orden_compra_id: oc.id,
        producto_id: i.producto_id,
        cantidad_solicitada: i.cantidad_solicitada
      }));
      const { error: errItems } = await supabase.from('orden_compra_items').insert(itemsFormatted);
      if (errItems) throw errItems;
    }

    return res.json({ ok: true, data: oc });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ACTUALIZAR ÓRDEN DE COMPRA
app.put('/api/ordenes-compra/:id', autenticarUsuario, verificarPermiso('ORDENES_CREAR'), async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('ordenes_compra')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// CONFIRMAR TURNO
app.put('/api/ordenes-compra/:id/confirmar-turno', autenticarUsuario, verificarPermiso('TURNO_CONFIRMAR'), async (req, res) => {
  const { id } = req.params;
  try {
    await supabase
      .from('turnos')
      .update({ estado: 'CONFIRMADO' })
      .eq('orden_compra_id', id);

    const { data: ocActualizada, error } = await supabase
      .from('ordenes_compra')
      .update({ estado: 'TURNO_CONFIRMADO' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ ok: true, mensaje: 'Turno confirmado con éxito', data: ocActualizada });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// =============================================================================
// RUTAS DE RECEPCIÓN
// =============================================================================

app.post('/api/recepciones', autenticarUsuario, verificarPermiso('RECEPCION_MERCADERIA'), async (req, res) => {
  const { orden_compra_id, recepciones } = req.body;

  try {
    for (const r of recepciones) {
      await supabase
        .from('orden_compra_items')
        .update({ cantidad_recibida: r.cantidad_recibida })
        .eq('id', r.item_id);
    }

    const { data: items } = await supabase
      .from('orden_compra_items')
      .select('cantidad_solicitada, cantidad_recibida')
      .eq('orden_compra_id', orden_compra_id);

    const todoEntregado = items.every((i) => (i.cantidad_recibida || 0) >= i.cantidad_solicitada);
    const nuevoEstado = todoEntregado ? 'ENTREGADO_TOTAL' : 'ENTREGADO_PARCIAL';

    const { data: ocActualizada, error } = await supabase
      .from('ordenes_compra')
      .update({ estado: nuevoEstado })
      .eq('id', orden_compra_id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ ok: true, mensaje: 'Recepción registrada con éxito', data: ocActualizada });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// =============================================================================
// CONFIGURACIÓN DE DISPONIBILIDAD Y CALENDARIO
// =============================================================================

app.get('/api/configuracion-disponibilidad', autenticarUsuario, verificarPermiso('CONFIGURACION_CUPOS'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('configuracion_disponibilidad').select('*');
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/api/configuracion-disponibilidad', autenticarUsuario, verificarPermiso('CONFIGURACION_CUPOS'), async (req, res) => {
  const { configuracion } = req.body;
  try {
    const { data, error } = await supabase.from('configuracion_disponibilidad').upsert(configuracion).select();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/turnos/calendario', autenticarUsuario, verificarPermiso('ORDENES_VER'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .select(`
        *,
        ordenes_compra (
          numero_oc,
          proveedores (nombre)
        )
      `);
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// =============================================================================
// PORTAL DE PROVEEDORES (RUTAS PÚBLICAS CON TOKEN)
// =============================================================================

app.get('/api/portal/validar-token/:token', async (req, res) => {
  const { token } = req.params;
  const { oc_id } = req.query;

  try {
    const { data: proveedor, error: errProv } = await supabase
      .from('proveedores')
      .select('*')
      .eq('token_acceso', token)
      .single();

    if (errProv || !proveedor) {
      return res.status(404).json({ ok: false, error: 'Token de proveedor inválido.' });
    }

    const { data: oc, error: errOc } = await supabase
      .from('ordenes_compra')
      .select(`
        *,
        orden_compra_items (id, cantidad_solicitada, productos (sku, descripcion))
      `)
      .eq('id', oc_id)
      .eq('proveedor_id', proveedor.id)
      .single();

    if (errOc || !oc) {
      return res.status(404).json({ ok: false, error: 'Orden de compra no encontrada para este proveedor.' });
    }

    return res.json({ ok: true, data: { proveedor, orden_compra: oc } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/portal/agendar-turno', async (req, res) => {
  const { orden_compra_id, fecha_turno, hora_inicio, hora_fin } = req.body;

  try {
    const { data: turno, error: errTurno } = await supabase
      .from('turnos')
      .insert([{ orden_compra_id, fecha_turno, hora_inicio, hora_fin, estado: 'SOLICITADO' }])
      .select()
      .single();

    if (errTurno) throw errTurno;

    await supabase
      .from('ordenes_compra')
      .update({ estado: 'TURNO_SOLICITADO' })
      .eq('id', orden_compra_id);

    return res.json({ ok: true, mensaje: 'Turno agendado con éxito', data: turno });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// =============================================================================
// ABM DE USUARIOS
// =============================================================================

app.get('/api/usuarios', autenticarUsuario, verificarPermiso('USUARIOS_ABM'), async (req, res) => {
  try {
    const { data: perfiles, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return res.json({ ok: true, data: perfiles });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/usuarios', autenticarUsuario, verificarPermiso('USUARIOS_ABM'), async (req, res) => {
  const { email, password, nombre, rol } = req.body;

  try {
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({ ok: false, error: 'Todos los campos son obligatorios.' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    const { data: perfilData, error: perfilError } = await supabase
      .from('perfiles')
      .insert([{ id: authData.user.id, nombre, rol }])
      .select()
      .single();

    if (perfilError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw perfilError;
    }

    return res.json({ ok: true, mensaje: 'Usuario creado exitosamente', data: perfilData });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/api/usuarios/:id', autenticarUsuario, verificarPermiso('USUARIOS_ABM'), async (req, res) => {
  const { id } = req.params;
  const { nombre, rol } = req.body;

  try {
    const { data, error } = await supabase
      .from('perfiles')
      .update({ nombre, rol })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ ok: true, mensaje: 'Usuario actualizado correctamente', data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.delete('/api/usuarios/:id', autenticarUsuario, verificarPermiso('USUARIOS_ABM'), async (req, res) => {
  const { id } = req.params;

  try {
    await supabase.from('perfiles').delete().eq('id', id);
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) throw authError;
    return res.json({ ok: true, mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// =============================================================================
// GESTIÓN DE ROLES Y PERMISOS (ADMIN / USUARIOS_ABM)
// =============================================================================

// Obtener la lista de roles, módulos disponibles y matriz de permisos
app.get('/api/roles', autenticarUsuario, verificarPermiso('USUARIOS_ABM'), async (req, res) => {
  try {
    const { data: roles, error: errRoles } = await supabase.from('roles').select('*').order('nombre');
    const { data: modulos, error: errModulos } = await supabase.from('modulos').select('*').order('categoria');
    const { data: permisos, error: errPermisos } = await supabase.from('rol_permisos').select('*');

    if (errRoles || errModulos || errPermisos) throw errRoles || errModulos || errPermisos;

    return res.json({ ok: true, data: { roles, modulos, permisos } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Crear un nuevo Rol con sus Permisos asignados
app.post('/api/roles', autenticarUsuario, verificarPermiso('USUARIOS_ABM'), async (req, res) => {
  const { id, nombre, descripcion, modulos } = req.body; // modulos: Array de IDs de módulos

  try {
    if (!id || !nombre) {
      return res.status(400).json({ ok: false, error: 'El ID y nombre del rol son obligatorios.' });
    }

    const idFormateado = id.toUpperCase().trim().replace(/\s+/g, '_');

    // 1. Insertar Rol
    const { data: rol, error: errRol } = await supabase
      .from('roles')
      .insert([{ id: idFormateado, nombre, descripcion }])
      .select()
      .single();

    if (errRol) throw errRol;

    // 2. Insertar Permisos
    if (modulos && modulos.length > 0) {
      const registrosPermisos = modulos.map((mId) => ({ rol_id: idFormateado, modulo_id: mId }));
      const { error: errPerms } = await supabase.from('rol_permisos').insert(registrosPermisos);
      if (errPerms) throw errPerms;
    }

    return res.json({ ok: true, mensaje: 'Rol creado con éxito', data: rol });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Actualizar los Permisos de un Rol existente
app.put('/api/roles/:id/permisos', autenticarUsuario, verificarPermiso('USUARIOS_ABM'), async (req, res) => {
  const { id } = req.params;
  const { modulos } = req.body; // Array de IDs de módulos asignados

  try {
    // 1. Limpiar permisos anteriores
    await supabase.from('rol_permisos').delete().eq('rol_id', id);

    // 2. Reinsertar la nueva selección
    if (modulos && modulos.length > 0) {
      const registros = modulos.map((mId) => ({ rol_id: id, modulo_id: mId }));
      const { error } = await supabase.from('rol_permisos').insert(registros);
      if (error) throw error;
    }

    return res.json({ ok: true, mensaje: 'Permisos actualizados correctamente' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// =============================================================================
// INICIALIZACIÓN DEL SERVIDOR
// =============================================================================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});