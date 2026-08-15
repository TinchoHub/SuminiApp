import React, { useState, useEffect, useRef } from 'react';
import { IconSearch } from './Icon';

export function BuscadorProducto({ productos, productoSeleccionadoId, onSelect, disabled }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
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
      <span style={searchIconStyle}>
        <IconSearch size={16} />
      </span>
      <input
        type="text"
        placeholder="Escribí SKU o nombre..."
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { setFocused(true); if (!disabled) setIsOpen(true); }}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '9px 10px 9px 34px',
          borderRadius: '9px',
          border: `1px solid ${focused ? '#c2660a' : '#e6ded0'}`,
          boxShadow: focused ? '0 0 0 3px #f6e6d0' : 'none',
          fontSize: '14px',
          fontFamily: "'Inter', system-ui, sans-serif",
          color: '#211c17',
          boxSizing: 'border-box',
          outline: 'none',
          backgroundColor: disabled ? '#f1ebe0' : '#fffdf9',
          transition: 'border-color .15s, box-shadow .15s'
        }}
      />

      {isOpen && !disabled && (
        <div style={dropdownStyle}>
          {productosFiltrados.length === 0 ? (
            <div style={{ padding: '12px', color: '#8c8172', fontSize: '13px', textAlign: 'center' }}>
              No se encontraron productos
            </div>
          ) : (
            productosFiltrados.map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleSelect(prod)}
                style={optionStyle}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#faf2e2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fffdf9')}
              >
                <span style={{ fontWeight: 700, color: '#9a4508', fontVariantNumeric: 'tabular-nums' }}>{prod.sku}</span>
                <span style={{ color: '#4a4038' }}> — {prod.descripcion}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const searchIconStyle = {
  position: 'absolute',
  left: '11px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#a89d8a',
  display: 'flex',
  pointerEvents: 'none',
  zIndex: 1
};

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: '6px',
  maxHeight: '190px',
  overflowY: 'auto',
  backgroundColor: '#fffdf9',
  border: '1px solid #e6ded0',
  borderRadius: '10px',
  boxShadow: '0 10px 24px rgba(16,18,22,0.10)',
  zIndex: 100,
  overflow: 'hidden'
};

const optionStyle = {
  padding: '9px 12px',
  cursor: 'pointer',
  borderBottom: '1px solid #f1ebe0',
  fontSize: '13px',
  transition: 'background .12s'
};
