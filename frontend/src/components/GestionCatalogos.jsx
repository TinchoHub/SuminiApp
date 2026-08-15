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
import { IconBuilding, IconTag, IconEdit, IconPlus } from './Icon';

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
    <div style={{ fontFamily: FONT }}>
      {/* Sub-Pestañas */}
      <div style={subTabsStyle}>
        <button
          onClick={() => setSubTab('PROVEEDORES')}
          style={subTab === 'PROVEEDORES' ? subTabActiveStyle : subTabStyle}
        >
          <IconBuilding size={16} /> Proveedores <span style={countBadge(subTab === 'PROVEEDORES')}>{proveedores.length}</span>
        </button>

        <button
          onClick={() => setSubTab('PRODUCTOS')}
          style={subTab === 'PRODUCTOS' ? subTabActiveStyle : subTabStyle}
        >
          <IconTag size={16} /> Productos / SKUs <span style={countBadge(subTab === 'PRODUCTOS')}>{productos.length}</span>
        </button>
      </div>

      {loading && <p style={{ color: '#8c8172', fontSize: '14px' }}>Cargando catálogo...</p>}
      {error && <div style={{ color: '#9c2b1f', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

      {!loading && subTab === 'PROVEEDORES' && (
        <div style={splitLayoutStyle}>
          {/* Formulario Proveedor */}
          <form onSubmit={handleSaveProveedor} style={cardStyle}>
            <h3 style={formTitleStyle}>
              {editingProv ? <><IconEdit size={16} /> Editar Proveedor</> : <><IconPlus size={16} /> Nuevo Proveedor</>}
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
              <div style={checkListStyle}>
                {productos.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#8c8172' }}>No hay productos cargados en el catálogo.</p>
                ) : (
                  productos.map(prod => (
                    <label key={prod.id} style={checkItemStyle}>
                      <input
                        type="checkbox"
                        checked={provProductos.includes(prod.id)}
                        onChange={() => handleToggleProdSelection(prod.id)}
                        style={{ accentColor: '#c2660a' }}
                      />
                      <span><strong style={{ color: '#9a4508' }}>{prod.sku}</strong> — {prod.descripcion}</span>
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
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>CUIT</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Teléfono</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr key={p.id} style={trStyle}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#211c17' }}>{p.nombre || p.razon_social}</td>
                    <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>{p.cuit || '—'}</td>
                    <td style={tdStyle}>{p.email_contacto || p.email}</td>
                    <td style={tdStyle}>{p.telefono || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => handleEditProvClick(p)} style={btnSmallStyle} title="Editar">
                        <IconEdit size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && subTab === 'PRODUCTOS' && (
        <div style={splitLayoutStyle}>
          {/* Formulario Producto */}
          <form onSubmit={handleSaveProducto} style={cardStyle}>
            <h3 style={formTitleStyle}>
              {editingProd ? <><IconEdit size={16} /> Editar Producto</> : <><IconPlus size={16} /> Nuevo Producto</>}
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
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Unidad</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} style={trStyle}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#9a4508', fontVariantNumeric: 'tabular-nums' }}>{p.sku}</td>
                    <td style={{ ...tdStyle, color: '#211c17' }}>{p.descripcion}</td>
                    <td style={{ ...tdStyle, color: '#8c8172' }}>{p.unidad_medida || 'UNIDAD'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => handleEditProdClick(p)} style={btnSmallStyle} title="Editar">
                        <IconEdit size={15} />
                      </button>
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
const FONT = "'Inter', system-ui, sans-serif";
const subTabsStyle = { display: 'flex', gap: '6px', marginBottom: '22px', background: '#fffdf9', border: '1px solid #e6ded0', borderRadius: '11px', padding: '6px', width: 'fit-content', boxShadow: '0 1px 2px rgba(16,18,22,0.05)' };
const subTabStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 14px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#8c8172', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer', fontFamily: FONT };
const subTabActiveStyle = { ...subTabStyle, backgroundColor: '#211c17', color: '#fffdf9' };
const countBadge = (active) => ({ display: 'inline-grid', placeItems: 'center', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: active ? '#c2660a' : '#f1ebe0', color: active ? '#fffdf9' : '#8c8172' });
const splitLayoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 2fr)', gap: '20px', alignItems: 'start' };
const cardStyle = { backgroundColor: '#fffdf9', border: '1px solid #e6ded0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 2px rgba(16,18,22,0.05)' };
const formTitleStyle = { display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '16px', color: '#211c17', fontSize: '15px', fontWeight: 700 };
const tableContainerStyle = { backgroundColor: '#fffdf9', border: '1px solid #e6ded0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,18,22,0.05)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' };
const thStyle = { padding: '12px 14px', backgroundColor: '#f5f0e6', color: '#8c8172', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #e6ded0' };
const trStyle = { borderBottom: '1px solid #f1ebe0' };
const tdStyle = { padding: '12px 14px', color: '#4a4038' };
const fieldStyle = { marginBottom: '13px' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a4038', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: '9px', border: '1px solid #e6ded0', boxSizing: 'border-box', fontSize: '14px', fontFamily: FONT, color: '#211c17', backgroundColor: '#fffdf9', outline: 'none' };
const checkListStyle = { maxHeight: '170px', overflowY: 'auto', border: '1px solid #e6ded0', borderRadius: '9px', padding: '10px', backgroundColor: '#faf2e2' };
const checkItemStyle = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '7px', cursor: 'pointer', color: '#4a4038' };
const btnPrimaryStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#211c17', color: '#fffdf9', border: 'none', padding: '10px 16px', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontFamily: FONT, fontSize: '14px' };
const btnSecondaryStyle = { backgroundColor: '#fffdf9', color: '#4a4038', border: '1px solid #e6ded0', padding: '10px 16px', borderRadius: '9px', cursor: 'pointer', fontWeight: 600, fontFamily: FONT, fontSize: '14px' };
const btnSmallStyle = { display: 'inline-grid', placeItems: 'center', width: '32px', height: '32px', backgroundColor: '#f1ebe0', border: '1px solid #e6ded0', borderRadius: '8px', cursor: 'pointer', color: '#4a4038' };
