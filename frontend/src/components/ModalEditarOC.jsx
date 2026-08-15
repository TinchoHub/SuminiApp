// frontend/src/components/ModalEditarOC.jsx
import React, { useEffect, useState } from 'react';
import { getProductosPorProveedor, updateOrdenCompra, deleteOrdenCompra } from '../services/api';
import { EstadoBadge } from './EstadoBadge';
import { BuscadorProducto } from './BuscadorProducto';
import { IconEdit, IconClose, IconPlus, IconTrash, IconLock, IconPackage, IconAlert, IconSave } from './Icon';

export function ModalEditarOC({ isOpen, onClose, oc, onOCUpdated }) {
  const [productosCat, setProductosCat] = useState([]);
  const [loadingCat, setLoadingCat] = useState(false);

  const hoyStr = new Date().toISOString().split('T')[0];

  const [fechaEmision, setFechaEmision] = useState(hoyStr);
  const [fechaLimite, setFechaLimite] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && oc) {
      setLoadingCat(true);
      setError(null);

      // Obtener el ID del proveedor de la OC
      const provId = oc.proveedor_id || oc.proveedores?.id;

      if (provId) {
        // Cargar ÚNICAMENTE los productos que comercializa este proveedor
        getProductosPorProveedor(provId)
          .then((res) => {
            if (res.ok && Array.isArray(res.data)) {
              setProductosCat(res.data);
            } else {
              setProductosCat([]);
            }
          })
          .catch(() => setError('No se pudieron cargar los productos del proveedor.'))
          .finally(() => setLoadingCat(false));
      } else {
        setProductosCat([]);
        setLoadingCat(false);
      }

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

  // Handler para eliminar la Orden de Compra con confirmación
  const handleDeleteOC = async () => {
    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar la Orden de Compra ${oc.numero_oc || ''}? Esta acción no se puede deshacer.`
    );

    if (!confirmacion) return;

    try {
      setDeleting(true);
      setError(null);
      const res = await deleteOrdenCompra(oc.id);

      if (res.ok) {
        onOCUpdated();
        onClose();
      } else {
        setError(res.error || 'Ocurrió un error al eliminar la OC.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con el servidor.');
    } finally {
      setDeleting(false);
    }
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
          `La cantidad solicitada para ${item.sku || 'el producto'} no puede ser menor a lo recibido (${item.cantidad_recibida}).`
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
    <div style={overlayStyle} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
            <span style={titleIconStyle}><IconEdit size={18} /></span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={titleStyle}>{oc.numero_oc}</h2>
                <EstadoBadge estado={oc.estado} />
              </div>
              <p style={subtitleStyle}>
                Proveedor: <strong style={{ color: '#211c17' }}>{oc.proveedores?.nombre || oc.proveedores?.razon_social || 'N/A'}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Cerrar"><IconClose size={18} /></button>
        </div>

        {error && <div style={errorStyle}><IconAlert size={16} /><span>{error}</span></div>}

        {loadingCat ? (
          <p style={loadingStyle}>Cargando productos del proveedor...</p>
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

            <hr style={dividerStyle} />

            <div style={sectionHeadStyle}>
              <h3 style={sectionTitleStyle}><IconPackage size={16} /> Detalle de Insumos / Productos</h3>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={productosCat.length === 0}
                style={{ ...buttonAddStyle, opacity: productosCat.length === 0 ? 0.5 : 1 }}
              >
                <IconPlus size={15} /> Agregar Producto
              </button>
            </div>

            {productosCat.length === 0 ? (
              <div style={warningBoxStyle}>
                <IconAlert size={16} />
                <span>Este proveedor no tiene productos vinculados en el catálogo.</span>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {items.map((item, index) => {
                  const yaRecibido = Number(item.cantidad_recibida || 0);

                  return (
                    <div key={index} style={itemRowStyle}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Buscar SKU / Insumo del Proveedor</label>
                        <BuscadorProducto
                          productos={productosCat}
                          productoSeleccionadoId={item.producto_id}
                          onSelect={(prodId) => handleItemChange(index, 'producto_id', prodId)}
                          disabled={yaRecibido > 0}
                        />
                      </div>

                      <div style={{ width: '104px' }}>
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

                      <div style={{ width: '82px', textAlign: 'center' }}>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Recibido</label>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '7px 10px',
                            borderRadius: '9px',
                            backgroundColor: yaRecibido > 0 ? '#e9ecdd' : '#f1ebe0',
                            color: yaRecibido > 0 ? '#3f6b1f' : '#8c8172',
                            fontWeight: 700,
                            fontSize: '13px',
                            fontVariantNumeric: 'tabular-nums'
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
                          <IconTrash size={16} />
                        </button>
                      ) : (
                        <div style={lockStyle} title="Bloqueado por recepciones previas">
                          <IconLock size={15} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={footerStyle}>
              {/* Botón de eliminación a la izquierda */}
              <button
                type="button"
                onClick={handleDeleteOC}
                disabled={submitting || deleting}
                style={buttonDeleteStyle}
              >
                <IconTrash size={15} />
                {deleting ? 'Eliminando...' : 'Eliminar Orden'}
              </button>

              {/* Botones de acción a la derecha */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting || deleting}
                  style={buttonCancelStyle}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || deleting || productosCat.length === 0}
                  style={{ ...buttonSubmitStyle, opacity: (submitting || deleting || productosCat.length === 0) ? 0.6 : 1 }}
                >
                  <IconSave size={16} />
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const FONT = "'Inter', system-ui, sans-serif";
const overlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(16,18,22,0.55)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' };
const modalStyle = { backgroundColor: '#fffdf9', borderRadius: '10px', width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', padding: '24px', boxShadow: '0 24px 60px rgba(16,18,22,0.28)', fontFamily: FONT, border: '1px solid #e6ded0' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', borderBottom: '1px solid #f1ebe0', paddingBottom: '14px' };
const titleIconStyle = { width: '34px', height: '34px', borderRadius: '9px', backgroundColor: '#f6e6d0', color: '#9a4508', display: 'grid', placeItems: 'center', flexShrink: 0 };
const titleStyle = { margin: 0, color: '#211c17', fontSize: '19px', fontWeight: 800, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' };
const subtitleStyle = { margin: '5px 0 0', color: '#8c8172', fontSize: '13px' };
const closeButtonStyle = { display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: '#f1ebe0', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#8c8172', flexShrink: 0 };
const loadingStyle = { textAlign: 'center', color: '#8c8172', padding: '20px', fontSize: '14px' };
const rowStyle = { display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' };
const fieldStyle = { flex: 1, minWidth: '200px' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#4a4038', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: '9px', border: '1px solid #e6ded0', boxSizing: 'border-box', fontSize: '14px', fontFamily: FONT, color: '#211c17', backgroundColor: '#fffdf9', outline: 'none' };
const errorStyle = { display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 14px', backgroundColor: '#f3e0da', color: '#9c2b1f', border: '1px solid #e6c4b8', borderRadius: '10px', marginBottom: '16px', fontSize: '13.5px', fontWeight: 500 };
const dividerStyle = { border: 'none', borderTop: '1px solid #f1ebe0', margin: '18px 0' };
const sectionHeadStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' };
const sectionTitleStyle = { display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '14px', fontWeight: 700, color: '#211c17' };
const warningBoxStyle = { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', backgroundColor: '#f6e6d0', color: '#9a4508', border: '1px solid #ecd3ab', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' };
const itemRowStyle = { display: 'flex', gap: '12px', alignItems: 'flex-end', backgroundColor: '#faf2e2', padding: '12px', borderRadius: '10px', marginBottom: '8px', border: '1px solid #ecdcc5' };
const buttonAddStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '9px', border: '1px solid #ecd3ab', backgroundColor: '#f6e6d0', color: '#9a4508', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT };
const buttonRemoveStyle = { display: 'grid', placeItems: 'center', width: '38px', height: '38px', background: '#f3e0da', border: '1px solid #e6c4b8', borderRadius: '9px', cursor: 'pointer', color: '#9c2b1f', flexShrink: 0 };
const lockStyle = { display: 'grid', placeItems: 'center', width: '38px', height: '38px', background: '#f1ebe0', borderRadius: '9px', color: '#a89d8a', flexShrink: 0 };
const footerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1ebe0', paddingTop: '16px', marginTop: '12px', gap: '10px', flexWrap: 'wrap' };
const buttonDeleteStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '9px', border: '1px solid #e6c4b8', backgroundColor: '#f3e0da', color: '#9c2b1f', cursor: 'pointer', fontWeight: 600, fontFamily: FONT, fontSize: '14px' };
const buttonCancelStyle = { padding: '10px 16px', borderRadius: '9px', border: '1px solid #e6ded0', backgroundColor: '#fffdf9', color: '#4a4038', cursor: 'pointer', fontWeight: 600, fontFamily: FONT, fontSize: '14px' };
const buttonSubmitStyle = { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '9px', border: 'none', backgroundColor: '#211c17', color: '#fffdf9', cursor: 'pointer', fontWeight: 700, fontFamily: FONT, fontSize: '14px' };
