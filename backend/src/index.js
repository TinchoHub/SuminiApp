// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://tu-deposito.vercel.app' // 👈 Poner la URL generada por Vercel
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ==========================================
// RUTAS DE PROVEEDORES
// ==========================================

// GET: Obtener todos los proveedores
app.get('/api/proveedores', autenticarUsuario, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error Supabase GET proveedores:', error);
      throw error;
    }

    // Normalizar la respuesta para que el frontend reciba propiedades consistentes
    const proveedoresNormalizados = (data || []).map(p => ({
      ...p,
      nombre: p.nombre || p.razon_social || 'Sin nombre',
      razon_social: p.razon_social || p.nombre || 'Sin nombre',
      email_contacto: p.email_contacto || p.email || '',
      email: p.email || p.email_contacto || '',
      cuit: p.cuit || '',
      telefono: p.telefono || ''
    }));

    return res.json({ ok: true, data: proveedoresNormalizados });
  } catch (error) {
    console.error('Error en GET /api/proveedores:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error al obtener proveedores.' });
  }
});

// GET: Obtener los productos que comercializa un proveedor específico
app.get('/api/proveedores/:id/productos', autenticarUsuario, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('proveedor_productos')
      .select('producto_id, productos(*)')
      .eq('proveedor_id', id);

    if (error) throw error;

    const productos = (data || []).map(row => row.productos).filter(Boolean);

    return res.json({ ok: true, data: productos });
  } catch (error) {
    console.error('Error al obtener productos del proveedor:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// POST: Crear Proveedor y asociar Productos
app.post('/api/proveedores', autenticarUsuario, async (req, res) => {
  try {
    const { nombre, razon_social, cuit, email, email_contacto, telefono, producto_ids } = req.body || {};

    const nombreValido = nombre || razon_social;
    const emailValido = email || email_contacto || null;

    if (!nombreValido) {
      return res.status(400).json({ ok: false, error: 'El nombre o razón social es obligatorio.' });
    }

    // 1. Crear el proveedor en la base de datos (Satisface 'nombre' y 'razon_social')
    const { data: prov, error: provErr } = await supabase
      .from('proveedores')
      .insert([{
        nombre: nombreValido,
        razon_social: nombreValido,
        cuit: cuit || null,
        email: emailValido,
        email_contacto: emailValido,
        telefono: telefono || null
      }])
      .select();

    if (provErr) {
      console.error('Error Supabase al crear proveedor:', provErr);
      return res.status(400).json({ ok: false, error: provErr.message });
    }

    const proveedorCreado = Array.isArray(prov) ? prov[0] : prov;

    // 2. Vincular los productos seleccionados en la tabla intermedia
    if (proveedorCreado && Array.isArray(producto_ids) && producto_ids.length > 0) {
      const relaciones = producto_ids.map(prodId => ({
        proveedor_id: proveedorCreado.id,
        producto_id: prodId
      }));

      const { error: relErr } = await supabase
        .from('proveedor_productos')
        .insert(relaciones);

      if (relErr) console.error('Error asociando productos al crear proveedor:', relErr);
    }

    return res.json({ ok: true, data: proveedorCreado });
  } catch (error) {
    console.error('Error al guardar proveedor:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error interno al crear proveedor.' });
  }
});

// PUT: Editar Proveedor y re-sincronizar Productos
app.put('/api/proveedores/:id', autenticarUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, razon_social, cuit, email, email_contacto, telefono, producto_ids } = req.body || {};

    const nombreValido = nombre || razon_social;
    const emailValido = email || email_contacto || null;

    // 1. Actualizar datos del proveedor
    const { data: prov, error: updateErr } = await supabase
      .from('proveedores')
      .update({
        nombre: nombreValido,
        razon_social: nombreValido,
        cuit: cuit || null,
        email: emailValido,
        email_contacto: emailValido,
        telefono: telefono || null
      })
      .eq('id', id)
      .select();

    if (updateErr) {
      console.error('Error Supabase al actualizar proveedor:', updateErr);
      return res.status(400).json({ ok: false, error: updateErr.message });
    }

    const proveedorActualizado = Array.isArray(prov) ? prov[0] : prov;

    // 2. Re-sincronizar tabla intermedia si se envió el array de productos
    if (Array.isArray(producto_ids)) {
      // Eliminar vínculos anteriores
      await supabase
        .from('proveedor_productos')
        .delete()
        .eq('proveedor_id', id);

      // Insertar nuevos vínculos
      if (producto_ids.length > 0) {
        const relaciones = producto_ids.map(prodId => ({
          proveedor_id: id,
          producto_id: prodId
        }));

        await supabase
          .from('proveedor_productos')
          .insert(relaciones);
      }
    }

    return res.json({ ok: true, data: proveedorActualizado });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error interno al actualizar proveedor.' });
  }
});

// PRODUCTOS
// GET: Obtener todos los productos
app.get('/api/productos', autenticarUsuario, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error Supabase GET productos:', error);
      throw error;
    }

    return res.json({ ok: true, data: data || [] });
  } catch (error) {
    console.error('Error en GET /api/productos:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error al obtener productos.' });
  }
});

// POST: Crear Producto
app.post('/api/productos', autenticarUsuario, async (req, res) => {
  try {
    const { sku, descripcion, nombre, unidad_medida } = req.body || {};

    const descFinal = descripcion || nombre || 'Sin descripción';
    const skuFinal = sku ? sku.trim().toUpperCase() : `SKU-${Date.now()}`;

    // Insertar producto
    const { data, error } = await supabase
      .from('productos')
      .insert([{
        sku: skuFinal,
        descripcion: descFinal,
        unidad_medida: unidad_medida || 'UNIDAD',
        stock: 0
      }])
      .select(); // Devolvemos el array creado sin forzar .single()

    if (error) {
      console.error('Error Supabase POST productos:', error);
      return res.status(400).json({ ok: false, error: error.message });
    }

    const productoCreado = Array.isArray(data) ? data[0] : data;
    return res.json({ ok: true, data: productoCreado });
  } catch (error) {
    console.error('Error interno en POST /api/productos:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error al crear producto.' });
  }
});

// PUT: Editar Producto
app.put('/api/productos/:id', autenticarUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, descripcion, nombre, unidad_medida } = req.body || {};

    const descFinal = descripcion || nombre;

    const { data, error } = await supabase
      .from('productos')
      .update({
        sku: sku ? sku.trim().toUpperCase() : undefined,
        descripcion: descFinal,
        unidad_medida: unidad_medida || 'UNIDAD'
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error Supabase PUT productos:', error);
      return res.status(400).json({ ok: false, error: error.message });
    }

    const productoActualizado = Array.isArray(data) ? data[0] : data;
    return res.json({ ok: true, data: productoActualizado });
  } catch (error) {
    console.error('Error interno en PUT /api/productos:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error al actualizar producto.' });
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
    // 1. Desestructurar agregando fecha_emision, observaciones y token
    const { 
      numero_oc, 
      proveedor_id, 
      fecha_emision,
      fecha_limite_entrega, 
      observaciones, 
      observacion, 
      items 
    } = req.body || {};

    const observacionesFinal = observaciones !== undefined ? observaciones : (observacion || null);
    const fEmisionFinal = fecha_emision || new Date().toISOString().split('T')[0];

    // 2. Generar el token único de acceso para el portal público del proveedor
    const tokenAcceso = crypto.randomUUID();

    // 3. Insertar cabecera guardando token_acceso, fecha_emision y observaciones
    const { data: oc, error: errOc } = await supabase
      .from('ordenes_compra')
      .insert([{ 
        numero_oc, 
        proveedor_id, 
        fecha_emision: fEmisionFinal,
        fecha_limite_entrega, 
        observaciones: observacionesFinal,
        token_acceso: tokenAcceso, // 👈 Genera el token necesario para el link público
        estado: 'PENDIENTE_TURNO' 
      }])
      .select()
      .single();

    if (errOc) throw errOc;

    // 4. Insertar los ítems en la tabla 'orden_compra_items'
    if (items && items.length > 0) {
      const itemsFormatted = items.map((i) => ({
        orden_compra_id: oc.id,
        producto_id: i.producto_id,
        cantidad_solicitada: Number(i.cantidad_solicitada || 1)
      }));
      
      const { error: errItems } = await supabase.from('orden_compra_items').insert(itemsFormatted);
      if (errItems) throw errItems;
    }

    return res.json({ ok: true, data: oc });
  } catch (error) {
    console.error('Error al crear orden de compra:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ACTUALIZAR ÓRDEN DE COMPRA
app.put('/api/ordenes-compra/:id', autenticarUsuario, verificarPermiso('ORDENES_CREAR'), async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Extraer 'items' para no enviarlo a la tabla 'ordenes_compra'
    const { 
      proveedor_id, 
      numero_oc, 
      fecha_emision, 
      fecha_limite_entrega, 
      observaciones, 
      estado, 
      items 
    } = req.body || {};

    const fechaLimiteFinal = fecha_limite_entrega;

    // 2. Actualizar únicamente las columnas pertenecientes a la cabecera
    const { data: oc, error: ocErr } = await supabase
      .from('ordenes_compra')
      .update({
        proveedor_id: proveedor_id || undefined,
        numero_oc: numero_oc || undefined,
        fecha_emision: fecha_emision || undefined,
        fecha_limite_entrega: fechaLimiteFinal || undefined,
        observaciones: observaciones !== undefined ? observaciones : undefined,
        estado: estado || undefined
      })
      .eq('id', id)
      .select();

    if (ocErr) throw ocErr;

    const ocActualizada = Array.isArray(oc) ? oc[0] : oc;

    // 3. Re-sincronizar los renglones en la tabla 'ordenes_compra_detalles'
    if (Array.isArray(items)) {
      // Borrar renglones antiguos de esta OC
      const { error: delErr } = await supabase
        .from('ordenes_compra_detalles')
        .delete()
        .eq('orden_compra_id', id);

      if (delErr) console.error('Error al borrar detalles previos:', delErr);

      // Insertar nuevos renglones
      if (items.length > 0) {
        const nuevosDetalles = items.map(item => ({
          orden_compra_id: id,
          producto_id: item.producto_id,
          cantidad_solicitada: Number(item.cantidad_solicitada || item.cantidad || 1),
          cantidad_recibida: Number(item.cantidad_recibida || 0)
        }));

        const { error: insErr } = await supabase
          .from('ordenes_compra_detalles')
          .insert(nuevosDetalles);

        if (insErr) throw insErr;
      }
    }

    return res.json({ ok: true, data: ocActualizada });
  } catch (error) {
    console.error('Error al actualizar OC:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});
// DELETE: Eliminar Orden de Compra
app.delete('/api/ordenes-compra/:id', autenticarUsuario, verificarPermiso('ORDENES_CREAR'), async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Opcional: Eliminar los turnos o detalles asociados primero si no tienes ON DELETE CASCADE en Postgres
    await supabase.from('turnos').delete().eq('orden_compra_id', id);
    await supabase.from('ordenes_compra_detalles').delete().eq('orden_compra_id', id);

    // 2. Eliminar la cabecera de la Orden de Compra
    const { error } = await supabase
      .from('ordenes_compra')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error Supabase al eliminar OC:', error);
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, mensaje: 'Orden de Compra eliminada con éxito.' });
  } catch (error) {
    console.error('Error interno al eliminar OC:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error interno al eliminar la orden.' });
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

// POST: Registrar Recepción de Mercadería (Soporta Recepción Parcial y Total)
app.post('/api/ordenes-compra/:id/recibir', autenticarUsuario, verificarPermiso('RECEPCION_ABM'), async (req, res) => {
  try {
    const { id } = req.params;
    // req.body llega directamente como Array desde ModalRecepcion.jsx
    const itemsIngresados = Array.isArray(req.body) ? req.body : (req.body?.items || []);

    if (!itemsIngresados || itemsIngresados.length === 0) {
      return res.status(400).json({ ok: false, error: 'No se recibieron ítems para procesar.' });
    }

    // 1. Obtener la Orden de Compra actual con sus ítems
    const { data: oc, error: ocErr } = await supabase
      .from('ordenes_compra')
      .select('*, ordenes_compra_detalles(*)')
      .eq('id', id)
      .single();

    if (ocErr || !oc) {
      return res.status(404).json({ ok: false, error: 'Orden de Compra no encontrada.' });
    }

    // 2. Procesar cada ítem ingresado
    for (const itemIngreso of itemsIngresados) {
      const { item_id, cantidad_ingresada } = itemIngreso;
      const cantNumber = Number(cantidad_ingresada || 0);

      if (cantNumber <= 0) continue; // Saltar si es 0

      // Buscar el detalle actual en la base de datos
      const detalleActual = (oc.ordenes_compra_detalles || []).find(d => d.id === item_id);
      if (!detalleActual) continue;

      const cantRecibidaPrevia = Number(detalleActual.cantidad_recibida || 0);
      const nuevaCantRecibida = cantRecibidaPrevia + cantNumber;

      // A) Actualizar cantidad_recibida en la tabla ordenes_compra_detalles
      await supabase
        .from('ordenes_compra_detalles')
        .update({ cantidad_recibida: nuevaCantRecibida })
        .eq('id', item_id);

      // B) Sumar stock en la tabla productos
      if (detalleActual.producto_id) {
        const { data: prod } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', detalleActual.producto_id)
          .maybeSingle();

        const stockActual = Number(prod?.stock || 0);
        await supabase
          .from('productos')
          .update({ stock: stockActual + cantNumber })
          .eq('id', detalleActual.producto_id);
      }
    }

    // 3. Volver a consultar la OC actualizada para determinar el nuevo estado
    const { data: detallesActualizados } = await supabase
      .from('ordenes_compra_detalles')
      .select('*')
      .eq('orden_compra_id', id);

    let totalSolicitado = 0;
    let totalRecibido = 0;

    (detallesActualizados || []).forEach(d => {
      totalSolicitado += Number(d.cantidad_solicitada || 0);
      totalRecibido += Number(d.cantidad_recibida || 0);
    });

    // Definir estado: RECIBIDA si está completa, RECIBIDA_PARCIAL si ingresó algo pero falta
    let nuevoEstado = oc.estado;
    if (totalRecibido >= totalSolicitado && totalSolicitado > 0) {
      nuevoEstado = 'RECIBIDA';
    } else if (totalRecibido > 0) {
      nuevoEstado = 'RECIBIDA_PARCIAL';
    }

    const { data: ocFinal, error: updateErr } = await supabase
      .from('ordenes_compra')
      .update({
        estado: nuevoEstado,
        fecha_recepcion: new Date().toISOString(),
        recibido_por: req.user?.nombre || req.user?.email || 'Sistema'
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return res.json({ ok: true, data: ocFinal, estado: nuevoEstado });
  } catch (error) {
    console.error('Error en registrarRecepcion:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error al procesar la recepción.' });
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
  try {
    const { configuracion } = req.body; // Array de objetos { nombre_dia, capacidad_maxima, activo, ... }

    if (!Array.isArray(configuracion)) {
      return res.status(400).json({ ok: false, error: 'El formato de configuración es inválido.' });
    }

    // CORRECCIÓN: Especificar onConflict con 'nombre_dia'
    const { data, error } = await supabase
      .from('configuracion_disponibilidad')
      .upsert(configuracion, { onConflict: 'nombre_dia' })
      .select();

    if (error) {
      console.error('Error al guardar disponibilidad:', error);
      throw error;
    }

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

// 1. Validar Token y Obtener Detalle de la Orden de Compra
app.get('/api/portal/validar-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const ocIdQuery = req.query.oc || req.query.oc_id;

    console.log('👉 Intento de validación - Token:', token, '| Query OC ID:', ocIdQuery);

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(400).json({ ok: false, error: 'Enlace incompleto o token no válido.' });
    }

    // A) Construir la consulta a Supabase
    let query = supabase.from('ordenes_compra').select('*').eq('token_acceso', token);

    // B) Si viene el parámetro 'oc' en la query string, lo agregamos para mayor precisión
    if (ocIdQuery) {
      query = query.eq('id', ocIdQuery);
    }

    const { data: ocData, error: ocError } = await query.maybeSingle();

    if (ocError) {
      console.error('❌ Error de Supabase al consultar token:', ocError);
      return res.status(500).json({ ok: false, error: `Error DB: ${ocError.message}` });
    }

    if (!ocData) {
      console.warn(`⚠️ No se encontró la OC en la BD con el Token: ${token}`);
      return res.status(404).json({ ok: false, error: 'El enlace ha expirado o no es válido.' });
    }

    // C) Obtener la Razón Social / Nombre del proveedor
    let nombreProveedor = 'Proveedor';
    if (ocData.proveedor_id) {
      const { data: prov } = await supabase
        .from('proveedores')
        .select('nombre, razon_social')
        .eq('id', ocData.proveedor_id)
        .maybeSingle();
      if (prov) {
        nombreProveedor = prov.nombre || prov.razon_social || 'Proveedor';
      }
    }

    // D) Obtener los ítems de la orden (soportando tanto orden_compra_items como ordenes_compra_detalles)
    let itemsData = [];
    const { data: items1 } = await supabase
      .from('orden_compra_items')
      .select('*, productos(*)')
      .eq('orden_compra_id', ocData.id);

    if (items1 && items1.length > 0) {
      itemsData = items1;
    } else {
      const { data: items2 } = await supabase
        .from('ordenes_compra_detalles')
        .select('*, productos(*)')
        .eq('orden_compra_id', ocData.id);
      itemsData = items2 || [];
    }

    return res.json({
      ok: true,
      proveedor: { nombre: nombreProveedor },
      oc: {
        id: ocData.id,
        numero_oc: ocData.numero_oc || ocData.id.slice(0, 8).toUpperCase(),
        fecha_limite_entrega: ocData.fecha_limite_entrega || 'No especificada',
        observaciones: ocData.observaciones || '',
        orden_compra_items: itemsData
      }
    });
  } catch (error) {
    console.error('❌ Error no controlado en validar-token:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// AGENDAR TURNO DE ENTREGA (Validación de cupos por hora y capacidad diaria)
app.post('/api/portal/agendar-turno', async (req, res) => {
  try {
    const { 
      orden_compra_id, 
      oc_id, 
      fecha_turno, 
      hora_inicio, 
      hora_turno, 
      patente_vehiculo, 
      datos_chofer 
    } = req.body || {};

    const targetOcId = orden_compra_id || oc_id;
    const targetHora = hora_inicio || hora_turno;

    if (!targetOcId || !fecha_turno || !targetHora) {
      return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios para agendar el turno.' });
    }

    // 1. Impedir fechas pasadas
    const hoyStr = new Date().toISOString().split('T')[0];
    if (fecha_turno < hoyStr) {
      return res.status(400).json({ ok: false, error: 'No se pueden agendar turnos en fechas pasadas.' });
    }

    // 2. Validar día habilitado consultando por 'dia_semana'
    const fechaObj = new Date(`${fecha_turno}T00:00:00Z`);
    const numDiaSemana = fechaObj.getUTCDay();

    const { data: configDia } = await supabase
      .from('configuracion_disponibilidad')
      .select('*')
      .eq('dia_semana', numDiaSemana)
      .maybeSingle();

    if (configDia && configDia.activo === false) {
      return res.status(400).json({ ok: false, error: 'El día seleccionado no está habilitado para recepciones.' });
    }

    // 3. Validar CUPOS POR HORA ESPECÍFICA (ej. Max 1 o 2 camiones a las 08:00)
    const cuposPorHora = configDia?.cupos_por_hora || 1;
    
    if (cuposPorHora > 0) {
      const { count: turnosEnEsaHora } = await supabase
        .from('ordenes_compra')
        .select('id', { count: 'exact', head: true })
        .eq('fecha_turno', fecha_turno)
        .eq('hora_turno', targetHora)
        .neq('id', targetOcId);

      if (turnosEnEsaHora >= cuposPorHora) {
        return res.status(400).json({ 
          ok: false, 
          error: `El horario de las ${targetHora} hs ya se encuentra completo para el día ${fecha_turno}. Por favor selecciona otra hora.` 
        });
      }
    }

    // 4. Validar CAPACIDAD MÁXIMA DIARIA (solo si la columna existe y es > 0)
    if (configDia?.capacidad_maxima && configDia.capacidad_maxima > 0) {
      const { count: turnosTotalesDia } = await supabase
        .from('ordenes_compra')
        .select('id', { count: 'exact', head: true })
        .eq('fecha_turno', fecha_turno)
        .neq('id', targetOcId);

      if (turnosTotalesDia >= configDia.capacidad_maxima) {
        return res.status(400).json({ 
          ok: false, 
          error: `Se alcanzó el cupo máximo total de recepciones (${configDia.capacidad_maxima}) para la fecha ${fecha_turno}.` 
        });
      }
    }

    // 5. Actualizar la cabecera de la Orden de Compra
    const updateDataOC = {
      fecha_turno,
      hora_turno: targetHora,
      estado: 'TURNO_SOLICITADO'
    };

    if (patente_vehiculo) updateDataOC.patente_vehiculo = patente_vehiculo;
    if (datos_chofer) updateDataOC.datos_chofer = datos_chofer;

    const { data: ocActualizada, error: errOC } = await supabase
      .from('ordenes_compra')
      .update(updateDataOC)
      .eq('id', targetOcId)
      .select()
      .single();

    if (errOC) throw errOC;

    // 6. Actualizar la tabla de turnos
    await supabase.from('turnos').delete().eq('orden_compra_id', targetOcId);

    const horaInt = parseInt(targetHora.split(':')[0], 10);
    const horaFinStr = (horaInt + 1) < 10 ? `0${horaInt + 1}:00` : `${horaInt + 1}:00`;

    await supabase
      .from('turnos')
      .insert([{
        orden_compra_id: targetOcId,
        fecha_turno,
        hora_inicio: targetHora,
        hora_fin: horaFinStr,
        patente_vehiculo: patente_vehiculo || null,
        datos_chofer: datos_chofer || null,
        estado: 'SOLICITADO'
      }]);

    return res.json({ ok: true, mensaje: 'Turno agendado con éxito.', data: ocActualizada });
  } catch (error) {
    console.error('Error en agendar-turno:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error al guardar el turno.' });
  }
});

// OBTENER CONFIGURACIÓN PÚBLICA DE DISPONIBILIDAD
app.get('/api/public/configuracion-disponibilidad', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('configuracion_disponibilidad')
      .select('*')
      .eq('activo', true);

    if (error) throw error;
    return res.json({ ok: true, data: data || [] });
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
  try {
    const { email, password, nombre, rol } = req.body;

    // 1. Validaciones básicas de campos
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({ ok: false, error: 'Todos los campos son obligatorios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // 2. Crear usuario en Supabase Auth, pasando nombre y rol como metadata.
    // El trigger "on_auth_user_created" (handle_new_user) toma estos valores
    // y crea la fila en public.perfiles automáticamente. Por eso ya NO hacemos
    // un insert manual aparte: evita el error de "duplicate key" (clave primaria
    // duplicada) contra la fila que el trigger ya insertó.
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, rol }
    });

    if (authError) {
      console.error('Error en Supabase Auth:', authError);
      return res.status(400).json({
        ok: false,
        error: authError.message || 'Error al crear la cuenta en Auth.'
      });
    }

    // 3. Leer el perfil que el trigger acaba de crear, para devolverlo en la respuesta
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', authUser.user.id)
      .single();

    if (perfilError) {
      console.error('Error leyendo el perfil recién creado:', perfilError);
      // El usuario de Auth y su perfil ya existen en este punto (el trigger corrió bien),
      // así que no hay que revertir nada: solo avisamos que no pudimos confirmar la lectura.
      return res.status(500).json({
        ok: false,
        error: 'El usuario se creó, pero no se pudo confirmar su perfil. Refrescá la lista.'
      });
    }

    return res.json({ ok: true, data: perfil });
  } catch (error) {
    console.error('Error inesperado al crear usuario:', error);
    const mensaje = typeof error === 'string'
      ? error
      : (error?.message || 'Error inesperado al crear usuario.');

    return res.status(500).json({ ok: false, error: mensaje });
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
