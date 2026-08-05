import React, { useState, useEffect, useRef } from 'react';

export function BuscadorProducto({ productos, productoSeleccionadoId, onSelect, disabled }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Inicializar texto con el SKU/Descripción actual si existe
  useEffect(() => {
    if (productoSeleccionadoId && productos.length > 0) {
      const prod = productos.find((p) => p.id === productoSeleccionadoId);
      if (prod) {
        setQuery(`[${prod.sku}] ${prod.descripcion}`);
      }
    }
  }, [productoSeleccionadoId, productos]);

  // Cerrar desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Productos filtrados según la búsqueda por SKU o Descripción
  const productosFiltrados = productos.filter((p) => {
    const q = query.toLowerCase();
    return p.sku?.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q);
  });

  const handleSelect = (prod) => {
    setQuery(`[${prod.sku}] ${prod.descripcion}`);
    onSelect(prod.id);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <input
        type="text"
        placeholder="🔍 Escribe SKU o nombre..."
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => !disabled && setIsOpen(true)}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          fontSize: '14px',
          boxSizing: 'border-box',
          backgroundColor: disabled ? '#f3f4f6' : '#ffffff'
        }}
      />

      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            maxHeight: '180px',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 100
          }}
        >
          {productosFiltrados.length === 0 ? (
            <div style={{ padding: '10px', color: '#6b7280', fontSize: '13px', textAlign: 'center' }}>
              No se encontraron productos
            </div>
          ) : (
            productosFiltrados.map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleSelect(prod)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: '13px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                <span style={{ fontWeight: '700', color: '#2563eb' }}>{prod.sku}</span> - {prod.descripcion}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}