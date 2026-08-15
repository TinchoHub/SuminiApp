import React, { useState, useEffect } from 'react';
import { registrarRecepcion } from '../services/api';
import { IconPackage, IconClose, IconAlert, IconSave } from './Icon';

export function ModalRecepcion({ isOpen, onClose, oc, onRecepcionSuccess }) {
  const [itemsRecibidos, setItemsRecibidos] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (oc && oc.orden_compra_items) {
      // Inicializar el formulario con cantidad 0 o el faltante por recibir
      const initialValues = {};
      oc.orden_compra_items.forEach((item) => {
        const pendiente = Math.max(0, Number(item.cantidad_solicitada) - Number(item.cantidad_recibida || 0));
        initialValues[item.id] = pendiente; // Sugerir el faltante por defecto
      });
      setItemsRecibidos(initialValues);
    }
  }, [oc]);

  if (!isOpen || !oc) return null;

  const handleInputChange = (itemId, valor) => {
    const num = Math.max(0, Number(valor));
    setItemsRecibidos((prev) => ({
      ...prev,
      [itemId]: num
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Formatear payload para la API: [{ item_id: '...', cantidad_ingresada: 50 }]
    const payload = Object.entries(itemsRecibidos).map(([itemId, cantidad]) => ({
      item_id: itemId,
      cantidad_ingresada: Number(cantidad)
    }));

    // Validar que al menos se ingrese un producto
    const totalIngresado = payload.reduce((acc, curr) => acc + curr.cantidad_ingresada, 0);
    if (totalIngresado === 0) {
      setError('Debes ingresar al menos una cantidad mayor a 0 para registrar la recepción.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await registrarRecepcion(oc.id, payload);
      if (res.ok) {
        onRecepcionSuccess();
        onClose();
      } else {
        setError(res.error || 'Ocurrió un error al registrar la recepción.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const items = oc.orden_compra_items || [];

  return (
    <div style={overlayStyle} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <span style={titleIconStyle}><IconPackage size={18} /></span>
            <div>
              <h2 style={titleStyle}>Recepción de Mercadería</h2>
              <p style={subtitleStyle}>
                OC <strong style={{ color: '#211c17' }}>{oc.numero_oc}</strong>
                <span style={{ margin: '0 6px', color: '#b6a996' }}>·</span>
                {oc.proveedores?.nombre}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Cerrar"><IconClose size={18} /></button>
        </div>

        {error && <div style={errorStyle}><IconAlert size={16} /><span>{error}</span></div>}

        <form onSubmit={handleSubmit}>
          <div style={tableWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>SKU / Insumo</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Pedida</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Recibida Previa</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: '130px' }}>Ingresa Ahora</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '18px', textAlign: 'center', color: '#8c8172' }}>
                      Esta Orden de Compra no posee ítems detallados.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const sku = item.productos?.sku || 'N/A';
                    const descripcion = item.productos?.descripcion || 'Insumo sin descripción';
                    const solicitada = Number(item.cantidad_solicitada);
                    const recibida = Number(item.cantidad_recibida || 0);
                    const pendiente = solicitada - recibida;

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1ebe0' }}>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700, color: '#9a4508', fontVariantNumeric: 'tabular-nums' }}>{sku}</span>
                          <br />
                          <small style={{ color: '#8c8172' }}>{descripcion}</small>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#211c17', fontVariantNumeric: 'tabular-nums' }}>
                          {solicitada}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: recibida > 0 ? '#3f6b1f' : '#8c8172', fontVariantNumeric: 'tabular-nums' }}>
                          {recibida}{' '}
                          {pendiente > 0 && <small style={{ color: '#9c2b1f' }}>(Falta {pendiente})</small>}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={itemsRecibidos[item.id] ?? 0}
                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                            style={inputNumberStyle}
                            required
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={footerStyle}>
            <button type="button" onClick={onClose} style={buttonCancelStyle}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || items.length === 0}
              style={{ ...buttonSubmitStyle, opacity: (submitting || items.length === 0) ? 0.6 : 1 }}
            >
              <IconSave size={16} />
              {submitting ? 'Guardando...' : 'Registrar Recepción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const FONT = "'Inter', system-ui, sans-serif";
const overlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(16,18,22,0.55)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' };
const modalStyle = { backgroundColor: '#fffdf9', borderRadius: '10px', width: '100%', maxWidth: '660px', maxHeight: '92vh', overflowY: 'auto', padding: '24px', boxShadow: '0 24px 60px rgba(16,18,22,0.28)', fontFamily: FONT, border: '1px solid #e6ded0' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', borderBottom: '1px solid #f1ebe0', paddingBottom: '14px' };
const titleIconStyle = { width: '34px', height: '34px', borderRadius: '9px', backgroundColor: '#f6e6d0', color: '#9a4508', display: 'grid', placeItems: 'center', flexShrink: 0 };
const titleStyle = { margin: 0, color: '#211c17', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' };
const subtitleStyle = { margin: '3px 0 0', color: '#8c8172', fontSize: '13px' };
const closeButtonStyle = { display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: '#f1ebe0', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#8c8172', flexShrink: 0 };
const errorStyle = { display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 14px', backgroundColor: '#f3e0da', color: '#9c2b1f', border: '1px solid #e6c4b8', borderRadius: '10px', marginBottom: '16px', fontSize: '13.5px', fontWeight: 500 };
const tableWrapStyle = { marginBottom: '20px', maxHeight: '360px', overflowY: 'auto', border: '1px solid #e6ded0', borderRadius: '12px' };
const thStyle = { padding: '11px 14px', backgroundColor: '#f5f0e6', color: '#8c8172', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #e6ded0', position: 'sticky', top: 0 };
const tdStyle = { padding: '12px 14px', color: '#4a4038' };
const inputNumberStyle = { width: '86px', padding: '8px', borderRadius: '9px', border: '1px solid #e6ded0', textAlign: 'center', fontSize: '14px', fontWeight: 700, fontFamily: FONT, color: '#211c17', outline: 'none' };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1ebe0', paddingTop: '16px' };
const buttonCancelStyle = { padding: '10px 16px', borderRadius: '9px', border: '1px solid #e6ded0', backgroundColor: '#fffdf9', color: '#4a4038', cursor: 'pointer', fontWeight: 600, fontFamily: FONT, fontSize: '14px' };
const buttonSubmitStyle = { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '9px', border: 'none', backgroundColor: '#3f6b1f', color: '#fffdf9', cursor: 'pointer', fontWeight: 700, fontFamily: FONT, fontSize: '14px' };
