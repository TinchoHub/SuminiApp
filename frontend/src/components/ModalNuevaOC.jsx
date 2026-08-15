// frontend/src/components/ModalNuevaOC.jsx
import React, { useEffect, useState } from 'react';
import { getProveedores, getProductosPorProveedor, createOrdenCompra } from '../services/api';
import { BuscadorProducto } from './BuscadorProducto';
import { IconClipboard, IconClose, IconPlus, IconTrash, IconPackage, IconInfo, IconAlert, IconSave } from './Icon';

export function ModalNuevaOC({ isOpen, onClose, onOCCreated }) {
  const [proveedores, setProveedores] = useState([]);
  const [productosProveedor, setProductosProveedor] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);

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

  // 1. Cargar proveedores al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setLoadingCatalogos(true);
      setError(null);

      getProveedores()
        .then((resProv) => {
          if (resProv.ok) setProveedores(resProv.data || []);
        })
        .catch(() => setError('No se pudieron cargar los proveedores.'))
        .finally(() => setLoadingCatalogos(false));

      setProveedorId('');
      setNumeroOc('');
      setFechaEmision(new Date().toISOString().split('T')[0]);
      setFechaLimite('');
      setObservaciones('');
      setItems([]);
      setProductosProveedor([]);
    }
  }, [isOpen]);

  // 2. Cargar sólo los productos asignados cuando cambia el Proveedor seleccionado
  useEffect(() => {
    if (!proveedorId) {
      setProductosProveedor([]);
      setItems([]);
      return;
    }

    setLoadingProductos(true);
    setItems([]); // Reiniciar ítems elegidos previa selección

    getProductosPorProveedor(proveedorId)
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          setProductosProveedor(res.data);
        } else {
          setProductosProveedor([]);
        }
      })
      .catch((err) => {
        console.error('Error al cargar productos del proveedor:', err);
        setProductosProveedor([]);
      })
      .finally(() => setLoadingProductos(false));
  }, [proveedorId]);

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
    <div style={overlayStyle} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={titleWrapStyle}>
            <span style={titleIconStyle}><IconClipboard size={18} /></span>
            <h2 style={titleStyle}>Nueva Orden de Compra</h2>
          </div>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Cerrar"><IconClose size={18} /></button>
        </div>

        {error && <div style={errorStyle}><IconAlert size={16} /><span>{error}</span></div>}

        {loadingCatalogos ? (
          <p style={loadingStyle}>Cargando proveedores...</p>
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
                    <option key={p.id} value={p.id}>
                      {p.nombre || p.razon_social}
                    </option>
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

            <hr style={dividerStyle} />

            <div style={sectionHeadStyle}>
              <h3 style={sectionTitleStyle}>
                <IconPackage size={16} />
                Insumos / Productos
                {loadingProductos && <small style={{ color: '#9a4508', fontWeight: 600 }}>(Cargando...)</small>}
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!proveedorId || productosProveedor.length === 0}
                style={{ ...buttonAddStyle, opacity: (!proveedorId || productosProveedor.length === 0) ? 0.5 : 1 }}
              >
                <IconPlus size={15} /> Agregar Insumo
              </button>
            </div>

            {!proveedorId ? (
              <div style={infoBoxStyle}>
                <IconInfo size={16} />
                <span>Selecciona un proveedor para cargar los insumos correspondientes.</span>
              </div>
            ) : productosProveedor.length === 0 && !loadingProductos ? (
              <div style={warningBoxStyle}>
                <IconAlert size={16} />
                <span>Este proveedor no posee productos asignados en el catálogo.</span>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {items.map((item, index) => (
                  <div key={index} style={itemRowStyle}>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>Buscar Insumo del Proveedor</label>
                      <BuscadorProducto
                        productos={productosProveedor}
                        productoSeleccionadoId={item.producto_id}
                        onSelect={(prodId) => handleItemChange(index, 'producto_id', prodId)}
                      />
                    </div>

                    <div style={{ width: '104px' }}>
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
                      <IconTrash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={footerStyle}>
              <button type="button" onClick={onClose} style={buttonCancelStyle}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !proveedorId || productosProveedor.length === 0}
                style={{ ...buttonSubmitStyle, opacity: (submitting || !proveedorId || productosProveedor.length === 0) ? 0.6 : 1 }}
              >
                <IconSave size={16} />
                {submitting ? 'Guardando...' : 'Crear Orden de Compra'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const FONT = "'Inter', system-ui, sans-serif";
const overlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(16,18,22,0.55)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' };
const modalStyle = { backgroundColor: '#fffdf9', borderRadius: '10px', width: '100%', maxWidth: '700px', maxHeight: '92vh', overflowY: 'auto', padding: '24px', boxShadow: '0 24px 60px rgba(16,18,22,0.28)', fontFamily: FONT, border: '1px solid #e6ded0' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1ebe0', paddingBottom: '14px' };
const titleWrapStyle = { display: 'flex', alignItems: 'center', gap: '11px' };
const titleIconStyle = { width: '34px', height: '34px', borderRadius: '9px', backgroundColor: '#f6e6d0', color: '#9a4508', display: 'grid', placeItems: 'center' };
const titleStyle = { margin: 0, color: '#211c17', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' };
const closeButtonStyle = { display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: '#f1ebe0', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#8c8172' };
const loadingStyle = { textAlign: 'center', color: '#8c8172', padding: '20px', fontSize: '14px' };
const rowStyle = { display: 'flex', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' };
const fieldStyle = { flex: 1, minWidth: '200px' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a4038', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: '9px', border: '1px solid #e6ded0', boxSizing: 'border-box', fontSize: '14px', fontFamily: FONT, color: '#211c17', backgroundColor: '#fffdf9', outline: 'none' };
const errorStyle = { display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 14px', backgroundColor: '#f3e0da', color: '#9c2b1f', border: '1px solid #e6c4b8', borderRadius: '10px', marginBottom: '16px', fontSize: '13.5px', fontWeight: 500 };
const dividerStyle = { border: 'none', borderTop: '1px solid #f1ebe0', margin: '18px 0' };
const sectionHeadStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' };
const sectionTitleStyle = { display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '14px', fontWeight: 700, color: '#211c17' };
const infoBoxStyle = { display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', backgroundColor: '#f5f0e6', border: '1px dashed #ddd3c2', borderRadius: '10px', color: '#8c8172', fontSize: '13px', marginBottom: '16px' };
const warningBoxStyle = { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', backgroundColor: '#f6e6d0', color: '#9a4508', border: '1px solid #ecd3ab', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' };
const itemRowStyle = { display: 'flex', gap: '12px', alignItems: 'flex-end', backgroundColor: '#faf2e2', padding: '12px', borderRadius: '10px', marginBottom: '8px', border: '1px solid #ecdcc5' };
const buttonAddStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '9px', border: '1px solid #ecd3ab', backgroundColor: '#f6e6d0', color: '#9a4508', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT };
const buttonRemoveStyle = { display: 'grid', placeItems: 'center', width: '38px', height: '38px', background: '#f3e0da', border: '1px solid #e6c4b8', borderRadius: '9px', cursor: 'pointer', color: '#9c2b1f', flexShrink: 0 };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1ebe0', paddingTop: '16px', marginTop: '12px' };
const buttonCancelStyle = { padding: '10px 16px', borderRadius: '9px', border: '1px solid #e6ded0', backgroundColor: '#fffdf9', color: '#4a4038', cursor: 'pointer', fontWeight: 600, fontFamily: FONT, fontSize: '14px' };
const buttonSubmitStyle = { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '9px', border: 'none', backgroundColor: '#211c17', color: '#fffdf9', cursor: 'pointer', fontWeight: 700, fontFamily: FONT, fontSize: '14px' };
