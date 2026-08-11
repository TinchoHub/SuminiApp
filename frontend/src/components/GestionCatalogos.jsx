// frontend/src/components/GestionCatalogos.jsx
import React, { useEffect, useState } from 'react';
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  getProductos,
  createProducto,
  updateProducto,
  getProductosPorProveedor
} from '../services/api';

export function GestionCatalogos() {
  const [subTab, setSubTab] = useState('PROVEEDORES'); // 'PROVEEDORES' | 'PRODUCTOS'

  // Datos
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados Formulario Proveedor
  const [editingProv, setEditingProv] = useState(null);
  const [provNombre, setProvNombre] = useState('');
  const [provCuit, setProvCuit] = useState(''); // 👈 CUIT integrado
  const [provEmail, setProvEmail] = useState('');
  const [provTelefono, setProvTelefono] = useState('');
  const [provProductos, setProvProductos] = useState([]); // Array de IDs de productos seleccionados

  // Estados Formulario Producto
  const [editingProd, setEditingProd] = useState(null);
  const [prodSku, setProdSku] = useState('');
  const [prodDescripcion, setProdDescripcion] = useState('');
  const [prodUnidad, setProdUnidad] = useState('UNIDAD');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resProv, resProd] = await Promise.all([getProveedores(), getProductos()]);
      if (resProv.ok) setProveedores(resProv.data);
      if (resProd.ok) setProductos(resProd.data);
    } catch (err) {
      setError('Error al cargar datos del catálogo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers Proveedores
  const handleEditProvClick = async (p) => {
    setEditingProv(p);
    setProvNombre(p.nombre || p.razon_social || '');
    setProvCuit(p.cuit || ''); // 👈 Carga el CUIT al editar
    setProvEmail(p.email_contacto || p.email || '');
    setProvTelefono(p.telefono || '');

    // Cargar los productos que ya tiene asignados este proveedor
    try {
      const res = await getProductosPorProveedor(p.id);
      if (res.ok && Array.isArray(res.data)) {
        setProvProductos(res.data.map(prod => prod.id));
      } else {
        setProvProductos([]);
      }
    } catch (err) {
      console.error('Error al obtener productos del proveedor:', err);
      setProvProductos([]);
    }
  };

  const handleResetProvForm = () => {
    setEditingProv(null);
    setProvNombre('');
    setProvCuit(''); // 👈 Limpia el CUIT al resetear
    setProvEmail('');
    setProvTelefono('');
    setProvProductos([]);
  };

  const handleToggleProdSelection = (prodId) => {
    setProvProductos(prev =>
      prev.includes(prodId)
        ? prev.filter(id => id !== prodId)
        : [...prev, prodId]
    );
  };

  const handleSaveProveedor = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: provNombre,
        razon_social: provNombre,
        cuit: provCuit, // 👈 Enviado en el payload
        email_contacto: provEmail,
        email: provEmail,
        telefono: provTelefono,
        producto_ids: provProductos // Array de UUIDs seleccionados
      };

      if (editingProv) {
        await updateProveedor(editingProv.id, payload);
      } else {
        await createProveedor(payload);
      }
      handleResetProvForm();
      loadData();
    } catch (err) {
      alert('Error al guardar el proveedor');
    }
  };

  // Handlers Productos
  const handleEditProdClick = (p) => {
    setEditingProd(p);
    setProdSku(p.sku || '');
    setProdDescripcion(p.descripcion || '');
    setProdUnidad(p.unidad_medida || 'UNIDAD');
  };

  const handleResetProdForm = () => {
    setEditingProd(null);
    setProdSku('');
    setProdDescripcion('');
    setProdUnidad('UNIDAD');
  };

  const handleSaveProducto = async (e) => {
    e.preventDefault();
    try {
      const payload = { sku: prodSku, descripcion: prodDescripcion, unidad_medida: prodUnidad };
      if (editingProd) {
        await updateProducto(editingProd.id, payload);
      } else {
        await createProducto(payload);
      }
      handleResetProdForm();
      loadData();
    } catch (err) {
      alert('Error al guardar el producto/SKU');
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Sub-Pestañas */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setSubTab('PROVEEDORES')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: subTab === 'PROVEEDORES' ? '#2563eb' : '#ffffff',
            color: subTab === 'PROVEEDORES' ? '#ffffff' : '#374151',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🏢 Proveedores ({proveedores.length})
        </button>

        <button
          onClick={() => setSubTab('PRODUCTOS')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: subTab === 'PRODUCTOS' ? '#2563eb' : '#ffffff',
            color: subTab === 'PRODUCTOS' ? '#ffffff' : '#374151',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🏷️ Productos / SKUs ({productos.length})
        </button>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Cargando catálogo...</p>}
      {error && <div style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</div>}

      {!loading && subTab === 'PROVEEDORES' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          {/* Formulario Proveedor */}
          <form onSubmit={handleSaveProveedor} style={cardStyle}>
            <h3 style={{ marginTop: 0, color: '#111827' }}>
              {editingProv ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}
            </h3>
            
            <div style={fieldStyle}>
              <label style={labelStyle}>Nombre / Razón Social *</label>
              <input
                type="text"
                value={provNombre}
                onChange={(e) => setProvNombre(e.target.value)}
                required
                style={inputStyle}
                placeholder="Ej: AgroRiego Argentina S.A."
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>CUIT / Identificación Fiscal</label>
              <input
                type="text"
                value={provCuit}
                onChange={(e) => setProvCuit(e.target.value)}
                style={inputStyle}
                placeholder="Ej: 30-12345678-9"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Email de Contacto *</label>
              <input
                type="email"
                value={provEmail}
                onChange={(e) => setProvEmail(e.target.value)}
                required
                style={inputStyle}
                placeholder="contacto@agroriego.com"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Teléfono</label>
              <input
                type="text"
                value={provTelefono}
                onChange={(e) => setProvTelefono(e.target.value)}
                style={inputStyle}
                placeholder="+54 11 1234-5678"
              />
            </div>

            {/* Selector de Insumos/Productos que provee */}
            <div style={fieldStyle}>
              <label style={labelStyle}>Productos / Insumos que Provee</label>
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px', backgroundColor: '#f9fafb' }}>
                {productos.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>No hay productos cargados en el catálogo.</p>
                ) : (
                  productos.map(prod => (
                    <label key={prod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '6px', cursor: 'pointer', color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={provProductos.includes(prod.id)}
                        onChange={() => handleToggleProdSelection(prod.id)}
                      />
                      <span><strong style={{ color: '#2563eb' }}>{prod.sku}</strong> - {prod.descripcion}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="submit" style={btnPrimaryStyle}>
                {editingProv ? 'Guardar Cambios' : 'Crear Proveedor'}
              </button>
              {editingProv && (
                <button type="button" onClick={handleResetProvForm} style={btnSecondaryStyle}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Tabla Proveedores */}
          <div style={tableContainerStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={thRowStyle}>
                  <th style={{ padding: '10px' }}>Nombre</th>
                  <th style={{ padding: '10px' }}>CUIT</th>
                  <th style={{ padding: '10px' }}>Email</th>
                  <th style={{ padding: '10px' }}>Teléfono</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px', fontWeight: '600' }}>{p.nombre || p.razon_social}</td>
                    <td style={{ padding: '10px', color: '#4b5563' }}>{p.cuit || '-'}</td>
                    <td style={{ padding: '10px', color: '#4b5563' }}>{p.email_contacto || p.email}</td>
                    <td style={{ padding: '10px', color: '#4b5563' }}>{p.telefono || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button onClick={() => handleEditProvClick(p)} style={btnSmallStyle}>✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && subTab === 'PRODUCTOS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          {/* Formulario Producto */}
          <form onSubmit={handleSaveProducto} style={cardStyle}>
            <h3 style={{ marginTop: 0, color: '#111827' }}>
              {editingProd ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
            </h3>
            <div style={fieldStyle}>
              <label style={labelStyle}>Código / SKU *</label>
              <input
                type="text"
                value={prodSku}
                onChange={(e) => setProdSku(e.target.value)}
                required
                style={inputStyle}
                placeholder="Ej: VALV-001"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Descripción / Insumo *</label>
              <input
                type="text"
                value={prodDescripcion}
                onChange={(e) => setProdDescripcion(e.target.value)}
                required
                style={inputStyle}
                placeholder="Válvula Selenoide 1 pulgada"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Unidad de Medida</label>
              <select
                value={prodUnidad}
                onChange={(e) => setProdUnidad(e.target.value)}
                style={inputStyle}
              >
                <option value="UNIDAD">Unidades (un)</option>
                <option value="CAJA">Cajas</option>
                <option value="METRO">Metros (m)</option>
                <option value="KG">Kilogramos (kg)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="submit" style={btnPrimaryStyle}>
                {editingProd ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
              {editingProd && (
                <button type="button" onClick={handleResetProdForm} style={btnSecondaryStyle}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Tabla Productos */}
          <div style={tableContainerStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={thRowStyle}>
                  <th style={{ padding: '10px' }}>SKU</th>
                  <th style={{ padding: '10px' }}>Descripción</th>
                  <th style={{ padding: '10px' }}>Unidad</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px', fontWeight: '700', color: '#2563eb' }}>{p.sku}</td>
                    <td style={{ padding: '10px' }}>{p.descripcion}</td>
                    <td style={{ padding: '10px', color: '#6b7280' }}>{p.unidad_medida || 'UNIDAD'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button onClick={() => handleEditProdClick(p)} style={btnSmallStyle}>✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos aislados
const cardStyle = { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const tableContainerStyle = { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const thRowStyle = { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#374151', fontSize: '12px', textTransform: 'uppercase' };
const fieldStyle = { marginBottom: '12px' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontSize: '14px' };
const btnPrimaryStyle = { backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };
const btnSecondaryStyle = { backgroundColor: '#ffffff', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' };
const btnSmallStyle = { backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' };