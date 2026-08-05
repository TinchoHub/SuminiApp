// frontend/src/services/api.js
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// 1. Cliente Supabase con API Key requerida
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Cliente Axios para el Backend Express
const api = axios.create({
  baseURL: API_URL,
});

// 3. Interceptor de Axios: Envía el Token JWT y la apikey en CADA petición
api.interceptors.request.use(async (config) => {
  try {
    // Adjuntar la apikey de Supabase
    if (SUPABASE_KEY) {
      config.headers['apikey'] = SUPABASE_KEY;
    }

    // Adjuntar el token Bearer del usuario autenticado
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch (err) {
    console.error('Error obteniendo sesión/token para API:', err);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// --- ENDPOINTS DE ROLES Y USUARIOS ---
export const getUsuarios = async () => (await api.get('/usuarios')).data;
export const createUsuario = async (data) => (await api.post('/usuarios', data)).data;
export const updateUsuario = async (id, data) => (await api.put(`/usuarios/${id}`, data)).data;
export const deleteUsuario = async (id, data) => (await api.delete(`/usuarios/${id}`)).data;

export const getRolesYPermisos = async () => (await api.get('/roles')).data;
export const createRol = async (data) => (await api.post('/roles', data)).data;
export const updatePermisosRol = async (rolId, modulos) => (await api.put(`/roles/${rolId}/permisos`, { modulos })).data;

// --- OTROS ENDPOINTS ---
export const getProveedores = async () => (await api.get('/proveedores')).data;
export const createProveedor = async (data) => (await api.post('/proveedores', data)).data;
export const updateProveedor = async (id, data) => (await api.put(`/proveedores/${id}`, data)).data;

export const getProductos = async () => (await api.get('/productos')).data;
export const createProducto = async (data) => (await api.post('/productos', data)).data;
export const updateProducto = async (id, data) => (await api.put(`/productos/${id}`, data)).data;

export const getOrdenesCompra = async () => (await api.get('/ordenes-compra')).data;
export const getOrdenCompraById = async (id) => (await api.get(`/ordenes-compra/${id}`)).data;
export const createOrdenCompra = async (data) => (await api.post('/ordenes-compra', data)).data;
export const updateOrdenCompra = async (id, data) => (await api.put(`/ordenes-compra/${id}`, data)).data;
export const confirmarTurno = async (id) => (await api.put(`/ordenes-compra/${id}/confirmar-turno`)).data;

export const registrarRecepcion = async (data) => (await api.post('/recepciones', data)).data;

export const getConfiguracionDisponibilidad = async () => (await api.get('/configuracion-disponibilidad')).data;
export const updateConfiguracionDisponibilidad = async (configuracion) => (await api.put('/configuracion-disponibilidad', { configuracion })).data;
export const getTurnosCalendario = async () => (await api.get('/turnos/calendario')).data;

export const validarTokenProveedor = async (token, ocId) => (await api.get(`/portal/validar-token/${token}?oc_id=${ocId}`)).data;
export const agendarTurnoProveedor = async (data) => (await api.post('/portal/agendar-turno', data)).data;

export default api;