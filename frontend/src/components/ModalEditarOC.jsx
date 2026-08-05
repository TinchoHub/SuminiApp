// frontend/src/components/ModalEditarOC.jsx
import React, { useEffect, useState } from 'react';
import { getProductos, updateOrdenCompra } from '../services/api';
import { EstadoBadge } from './EstadoBadge';
import { BuscadorProducto } from './BuscadorProducto';

export function ModalEditarOC({ isOpen, onClose, oc, onOCUpdated }) {
  const [productosCat, setProductosCat] = useState([]);
  const [loadingCat, setLoadingCat] = useState(false);

  const hoyStr = new Date().toISOString().split('T')[0];

  const [fechaEmision, setFechaEmision] = useState(hoyStr);
  const [fechaLimite, setFechaLimite] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && oc) {
      setLoadingCat(true);
      setError(null);

      getProductos()
        .then((res) => {
          if (res.ok) setProductosCat(res.data);
        })
        .catch(() => setError('No se pudo cargar el catálogo.'))
        .finally(() => setLoadingCat(false));

      // Extraer fecha_emision si existe, o usar hoy por defecto
      const fEmisionOC = oc.fecha_emision || (oc.created_at ? oc.created_at.split('T')[0] : hoyStr);
      setFechaEmision(fEmisionOC);
      setFechaLimite(oc.fecha_limite_entrega || '');
      setObservaciones(oc.observaciones || '');

      if (oc.orden_compra_items && Array.isArray(oc.orden_compra_items)) {
        const formattedItems = oc.orden_compra_items.map((item) => ({
          id: item.id,
          producto_id: item.producto_id || item.productos?.id,
          cantidad_solicitada: item.cantidad_solicitada,
          cantidad_recibida: item.cantidad_recibida || 0,
          sku: item.productos?.sku || '',
          descripcion: item.productos?.descripcion || ''
        }));
        setItems(formattedItems);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, oc]);

  if (!isOpen || !oc) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: null,
        producto_id: '',
        cantidad_solicitada: 1,
        cantidad_recibida: 0,
        sku: '',
        descripcion: ''
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      if (field === 'producto_id') {
        const prod = productosCat.find((p) => p.id === value);
        updated[index] = {
          ...updated[index],
          producto_id: value,
          sku: prod?.sku || '',
          descripcion: prod?.descripcion || ''
        };
      } else if (field === 'cantidad_solicitada') {
        updated[index] = {
          ...updated[index],
          cantidad_solicitada: Math.max(1, Number(value))
        };
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fechaEmision || !fechaLimite) {
      setError('Las Fechas de Emisión y Límite de Entrega son obligatorias.');
      return;
    }

    if (items.length === 0) {
      setError('La Orden de Compra debe contener al menos un producto.');
      return;
    }

    if (items.some((i) => !i.producto_id)) {
      setError('Asegúrate de haber seleccionado un producto válido en cada renglón.');
      return;
    }

    for (const item of items) {
      if (Number(item.cantidad_solicitada) < Number(item.cantidad_recibida)) {
        setError(
          `La cantidad solicitada para ${item.sku} no puede ser menor a lo recibido (${item.cantidad_recibida}).`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        fecha_emision: fechaEmision,
        fecha_limite_entrega: fechaLimite,
        observaciones,
        items: items.map((i) => ({
          producto_id: i.producto_id,
          cantidad_solicitada: Number(i.cantidad_solicitada)
        }))
      };

      const res = await updateOrdenCompra(oc.id, payload);
      if (res.ok) {
        onOCUpdated();
        onClose();
      } else {
        setError(res.error || 'Ocurrió un error al actualizar la OC.');
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>
                ✏️ Detalle y Edición: {oc.numero_oc}
              </h2>
              <EstadoBadge estado={oc.estado} />
            </div>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
              Proveedor: <strong>{oc.proveedores?.nombre || 'N/A'}</strong>
            </p>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {loadingCat ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>Cargando catálogo...</p>
        ) : (
          <form onSubmit={handleSubmit}>
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

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Observaciones / Notas</label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                style={inputStyle}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '18px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#374151' }}>📦 Detalle de Insumos / Productos</h3>
              <button type="button" onClick={handleAddItem} style={buttonAddStyle}>
                ➕ Agregar Producto
              </button>
            </div>

            <div style={{ marginBottom: '20px', maxHeight: '250px', overflowY: 'visible' }}>
              {items.map((item, index) => {
                const yaRecibido = Number(item.cantidad_recibida || 0);

                return (
                  <div key={index} style={itemRowStyle}>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>Buscar SKU / Insumo</label>
                      <BuscadorProducto
                        productos={productosCat}
                        productoSeleccionadoId={item.producto_id}
                        onSelect={(prodId) => handleItemChange(index, 'producto_id', prodId)}
                        disabled={yaRecibido > 0}
                      />
                    </div>

                    <div style={{ width: '110px' }}>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>Cant. Pedida</label>
                      <input
                        type="number"
                        min={yaRecibido > 0 ? yaRecibido : 1}
                        value={item.cantidad_solicitada}
                        onChange={(e) => handleItemChange(index, 'cantidad_solicitada', e.target.value)}
                        style={{ ...inputStyle, textAlign: 'center' }}
                        required
                      />
                    </div>

                    <div style={{ width: '90px', textAlign: 'center' }}>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>Recibido</label>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: yaRecibido > 0 ? '#dcfce7' : '#f3f4f6',
                          color: yaRecibido > 0 ? '#15803d' : '#6b7280',
                          fontWeight: '700',
                          fontSize: '13px'
                        }}
                      >
                        {yaRecibido}
                      </span>
                    </div>

                    {yaRecibido === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        style={buttonRemoveStyle}
                        title="Eliminar renglón"
                      >
                        🗑️
                      </button>
                    ) : (
                      <div style={{ width: '30px' }} title="Bloqueado por recepciones previas">🔒</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={footerStyle}>
              <button type="button" onClick={onClose} style={buttonCancelStyle}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting} style={buttonSubmitStyle}>
                {submitting ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' };
const modalStyle = { backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '700px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', fontFamily: 'system-ui, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' };
const closeButtonStyle = { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9ca3af' };
const rowStyle = { display: 'flex', gap: '16px', marginBottom: '12px' };
const fieldStyle = { flex: 1 };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontSize: '14px' };
const errorStyle = { padding: '10px 14px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' };
const itemRowStyle = { display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f9fafb', padding: '10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #f3f4f6' };
const buttonAddStyle = { padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#2563eb', fontSize: '13px', fontWeight: '600', cursor: 'pointer' };
const buttonRemoveStyle = { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '6px' };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '12px' };
const buttonCancelStyle = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#374151', cursor: 'pointer', fontWeight: '600' };
const buttonSubmitStyle = { padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: '600' };