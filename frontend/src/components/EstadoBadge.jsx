import React from 'react';
import { IconClock, IconCalendar, IconCheck, IconPackage, IconTruck } from './Icon';

export function EstadoBadge({ estado }) {
  let label = estado;
  let bg = '#f1ebe0';
  let color = '#4a4038';
  let border = '#e6ded0';
  let dot = '#8c8172';
  let IconComp = null;

  switch (estado) {
    case 'PENDIENTE_TURNO':
      label = 'Pendiente Turno';
      bg = '#f6e6d0'; color = '#9a4508'; border = '#ecd3ab'; dot = '#c2660a';
      IconComp = IconClock;
      break;

    case 'TURNO_SOLICITADO':
      label = 'Turno Solicitado';
      bg = '#e6e8e2'; color = '#3a5972'; border = '#c9cabb'; dot = '#3a5972';
      IconComp = IconCalendar;
      break;

    case 'TURNO_CONFIRMADO':
      label = 'Turno Confirmado';
      bg = '#e9ecdd'; color = '#3f6b1f'; border = '#d2d9c0'; dot = '#3f6b1f';
      IconComp = IconCheck;
      break;

    case 'ENTREGADO_PARCIAL':
      label = 'Entregado Parcial';
      bg = '#fff4ed'; color = '#9c4a0f'; border = '#ecd3ab'; dot = '#b8570f';
      IconComp = IconTruck;
      break;

    case 'ENTREGADO_TOTAL':
    case 'ENTREGADO':
      label = 'Entregado Total';
      bg = '#e9ecdd'; color = '#2d5016'; border = '#bbe8cf'; dot = '#2d5016';
      IconComp = IconPackage;
      break;

    default:
      label = estado || 'Sin Estado';
      break;
  }

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px 4px 8px',
    borderRadius: '4px',
    borderLeft: `3px solid ${dot}`,
    backgroundColor: bg,
    color: color,
    border: `1px solid ${border}`,
    borderLeftWidth: '3px',
    borderLeftColor: dot,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '.02em',
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    fontFamily: "'Inter', system-ui, sans-serif"
  };

  return (
    <span style={badgeStyle}>
      {IconComp ? (
        <IconComp size={12} strokeWidth={2.25} />
      ) : (
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dot, display: 'inline-block' }} />
      )}
      {label}
    </span>
  );
}
