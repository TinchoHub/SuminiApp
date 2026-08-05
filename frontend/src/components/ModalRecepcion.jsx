import React, { useState, useEffect } from 'react';
import { registrarRecepcion } from '../services/api';

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
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>📦 Recepción de Mercadería</h2>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
              Orden de Compra: <strong>{oc.numero_oc}</strong> | Proveedor: <strong>{oc.proveedores?.nombre}</strong>
            </p>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px', maxHeight: '350px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '10px' }}>SKU / Insumo</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Pedida</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Recibida Previa</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '130px' }}>Ingresa Ahora</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
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
                      <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px' }}>
                          <span style={{ fontWeight: '600', color: '#2563eb' }}>{sku}</span>
                          <br />
                          <small style={{ color: '#4b5563' }}>{descripcion}</small>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>
                          {solicitada}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', color: recibida > 0 ? '#16a34a' : '#6b7280' }}>
                          {recibida} {pendiente > 0 && <small style={{ color: '#dc2626' }}>(Falta {pendiente})</small>}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
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
            <button type="submit" disabled={submitting || items.length === 0} style={buttonSubmitStyle}>
              {submitting ? 'Guardando...' : '💾 Registrar Recepción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Estilos
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '16px'
};

const modalStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '650px',
  padding: '24px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  fontFamily: 'system-ui, sans-serif'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '16px',
  borderBottom: '1px solid #f3f4f6',
  paddingBottom: '12px'
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
  color: '#9ca3af'
};

const errorStyle = {
  padding: '10px 14px',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  borderRadius: '6px',
  marginBottom: '16px',
  fontSize: '14px'
};

const inputNumberStyle = {
  width: '80px',
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  textAlign: 'center',
  fontSize: '14px',
  fontWeight: '600'
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  borderTop: '1px solid #f3f4f6',
  paddingTop: '16px'
};

const buttonCancelStyle = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  color: '#374151',
  cursor: 'pointer',
  fontWeight: '600'
};

const buttonSubmitStyle = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#16a34a',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: '600'
};