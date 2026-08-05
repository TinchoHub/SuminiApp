// frontend/src/components/ModalNuevaOC.jsx
import React, { useEffect, useState } from 'react';
import { getProveedores, getProductos, createOrdenCompra } from '../services/api';
import { BuscadorProducto } from './BuscadorProducto';

export function ModalNuevaOC({ isOpen, onClose, onOCCreated }) {
  const [proveedores, setProveedores] = useState([]);
  const [productosCat, setProductosCat] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  // Fecha actual YYYY-MM-DD por defecto
  const hoyStr = new Date().toISOString().split('T')[0];

  const [proveedorId, setProveedorId] = useState('');
  const [numeroOc, setNumeroOc] = useState('');
  const [fechaEmision, setFechaEmision] = useState(hoyStr);
  const [fechaLimite, setFechaLimite] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingCatalogos(true);
      setError(null);

      Promise.all([getProveedores(), getProductos()])
        .then(([resProv, resProd]) => {
          if (resProv.ok) setProveedores(resProv.data);
          if (resProd.ok) setProductosCat(resProd.data);
        })
        .catch(() => setError('No se pudieron cargar proveedores o productos.'))
        .finally(() => setLoadingCatalogos(false));

      setProveedorId('');
      setNumeroOc('');
      setFechaEmision(new Date().toISOString().split('T')[0]);
      setFechaLimite('');
      setObservaciones('');
      setItems([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { producto_id: '', cantidad_solicitada: 1 }]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === 'cantidad_solicitada' ? Math.max(1, Number(value)) : value
      };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!proveedorId || !numeroOc || !fechaEmision || !fechaLimite) {
      setError('Por favor, completa todos los campos obligatorios del encabezado.');
      return;
    }

    if (items.length === 0) {
      setError('Debes agregar al menos un producto a la Orden de Compra.');
      return;
    }

    if (items.some((i) => !i.producto_id)) {
      setError('Asegúrate de haber seleccionado un producto válido en cada renglón.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createOrdenCompra({
        proveedor_id: proveedorId,
        numero_oc: numeroOc,
        fecha_emision: fechaEmision,
        fecha_limite_entrega: fechaLimite,
        observaciones,
        items
      });

      if (res.ok) {
        onOCCreated();
        onClose();
      } else {
        setError(res.error || 'Error al crear la Orden de Compra.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>📄 Nueva Orden de Compra</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {loadingCatalogos ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>Cargando datos...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Proveedor *</label>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  required
                  style={inputStyle}
                >
                  <option value="">Selecciona un proveedor...</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>N° Orden de Compra *</label>
                <input
                  type="text"
                  placeholder="Ej: OC-2026-005"
                  value={numeroOc}
                  onChange={(e) => setNumeroOc(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Fecha de Emisión *</label>
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Fecha Límite de Entrega *</label>
                <input
                  type="date"
                  value={fechaLimite}
                  onChange={(e) => setFechaLimite(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Observaciones / Notas</label>
              <input
                type="text"
                placeholder="Ej: Entregar por Portón 2"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                style={inputStyle}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '18px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#374151' }}>📦 Insumos / Productos</h3>
              <button type="button" onClick={handleAddItem} style={buttonAddStyle}>
                ➕ Agregar Insumo
              </button>
            </div>

            <div style={{ marginBottom: '20px', maxHeight: '230px', overflowY: 'visible' }}>
              {items.map((item, index) => (
                <div key={index} style={itemRowStyle}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Buscar Insumo por SKU / Nombre</label>
                    <BuscadorProducto
                      productos={productosCat}
                      productoSeleccionadoId={item.producto_id}
                      onSelect={(prodId) => handleItemChange(index, 'producto_id', prodId)}
                    />
                  </div>

                  <div style={{ width: '110px' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad_solicitada}
                      onChange={(e) => handleItemChange(index, 'cantidad_solicitada', e.target.value)}
                      style={{ ...inputStyle, textAlign: 'center' }}
                      required
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    style={buttonRemoveStyle}
                    title="Eliminar renglón"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <div style={footerStyle}>
              <button type="button" onClick={onClose} style={buttonCancelStyle}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting} style={buttonSubmitStyle}>
                {submitting ? 'Guardando...' : '💾 Crear Orden de Compra'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' };
const modalStyle = { backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '680px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', fontFamily: 'system-ui, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' };
const closeButtonStyle = { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9ca3af' };
const rowStyle = { display: 'flex', gap: '16px', marginBottom: '14px' };
const fieldStyle = { flex: 1 };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontSize: '14px' };
const errorStyle = { padding: '10px 14px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' };
const itemRowStyle = { display: 'flex', gap: '12px', alignItems: 'flex-end', backgroundColor: '#f9fafb', padding: '10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #f3f4f6' };
const buttonAddStyle = { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#2563eb', fontSize: '13px', fontWeight: '600', cursor: 'pointer' };
const buttonRemoveStyle = { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '8px 4px' };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '12px' };
const buttonCancelStyle = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#374151', cursor: 'pointer', fontWeight: '600' };
const buttonSubmitStyle = { padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', cursor: 'pointer', fontWeight: '600' };