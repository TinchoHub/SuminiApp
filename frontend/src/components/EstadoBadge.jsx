import React from 'react';

export function EstadoBadge({ estado }) {
  let label = estado;
  let bg = '#f3f4f6';
  let color = '#374151';
  let border = '#d1d5db';

  switch (estado) {
    case 'PENDIENTE_TURNO':
      label = '⏳ Pendiente Turno';
      bg = '#fffeb3';
      color = '#854d0e';
      border = '#fef08a';
      break;

    case 'TURNO_SOLICITADO':
      label = '📅 Turno Solicitado';
      bg = '#eff6ff';
      color = '#1d4ed8';
      border = '#bfdbfe';
      break;

    case 'TURNO_CONFIRMADO':
      label = '✅ Turno Confirmado';
      bg = '#f0fdf4';
      color = '#15803d';
      border = '#bbf7d0';
      break;

    case 'ENTREGADO_PARCIAL':
      label = '🟡 Entregado Parcial';
      bg = '#fff7ed';
      color = '#c2410c';
      border = '#ffedd5';
      break;

    case 'ENTREGADO_TOTAL':
    case 'ENTREGADO':
      label = '📦 Entregado Total';
      bg = '#ecfdf5';
      color = '#047857';
      border = '#a7f3d0';
      break;

    default:
      label = estado || 'Sin Estado';
      break;
  }

  const badgeStyle = {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '9999px',
    backgroundColor: bg,
    color: color,
    border: `1px solid ${border}`,
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  };

  return <span style={badgeStyle}>{label}</span>;
}