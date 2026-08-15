// frontend/src/App.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase, getOrdenesCompra, confirmarTurno } from './services/api';
import { Login } from './components/Login';
import { EstadoBadge } from './components/EstadoBadge';
import { ModalNuevaOC } from './components/ModalNuevaOC';
import { ModalRecepcion } from './components/ModalRecepcion';
import { ModalEditarOC } from './components/ModalEditarOC';
import { VistaCalendario } from './components/VistaCalendario';
import { ConfigDisponibilidad } from './components/ConfigDisponibilidad';
import { GestionCatalogos } from './components/GestionCatalogos';
import { UsuariosABM } from './components/UsuariosABM';

/* ------------------------------------------------------------------ */
/*  ICONOS (SVG en línea, sin dependencias)                            */
/* ------------------------------------------------------------------ */
const Icon = ({ path, size = 16, strokeWidth = 1.8, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {path}
  </svg>
);

const IconPackage = (p) => <Icon {...p} path={<><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>} />;
const IconPlus = (p) => <Icon {...p} path={<><path d="M5 12h14" /><path d="M12 5v14" /></>} />;
const IconRefresh = (p) => <Icon {...p} path={<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>} />;
const IconLogout = (p) => <Icon {...p} path={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>} />;
const IconSearch = (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>} />;
const IconClipboard = (p) => <Icon {...p} path={<><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></>} />;
const IconCalendar = (p) => <Icon {...p} path={<><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></>} />;
const IconGrid = (p) => <Icon {...p} path={<><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>} />;
const IconSettings = (p) => <Icon {...p} path={<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>} />;
const IconUsers = (p) => <Icon {...p} path={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />;
const IconClock = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} />;
const IconLink = (p) => <Icon {...p} path={<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>} />;
const IconCheck = (p) => <Icon {...p} path={<><polyline points="20 6 9 17 4 12" /></>} />;
const IconEdit = (p) => <Icon {...p} path={<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>} />;
const IconInbox = (p) => <Icon {...p} path={<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>} />;
const IconChevron = ({ dir = 'updown', ...p }) => {
  if (dir === 'asc') return <Icon {...p} size={13} path={<polyline points="18 15 12 9 6 15" />} />;
  if (dir === 'desc') return <Icon {...p} size={13} path={<polyline points="6 9 12 15 18 9" />} />;
  return <Icon {...p} size={13} strokeWidth={1.6} path={<><polyline points="8 9 12 5 16 9" /><polyline points="16 15 12 19 8 15" /></>} />;
};

/* ------------------------------------------------------------------ */
/*  ESTILOS GLOBALES (inyectados una sola vez, sin Tailwind)           */
/* ------------------------------------------------------------------ */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    :root {
      --ink: #211c17;
      --ink-2: #4a4038;
      --muted: #8c8172;
      --muted-2: #a89d8a;
      --line: #e6ded0;
      --line-2: #f1ebe0;
      --surface: #fffdf9;
      --bg: #f5f0e6;
      --sidebar: #221d18;
      --sidebar-2: #2c261f;
      --sidebar-line: #3a332a;
      --sidebar-text: #cabfae;
      --accent: #c2660a;
      --accent-strong: #9a4508;
      --accent-tint: #f6e6d0;
      --accent-border: #ecd3ab;
      --success: #3f6b1f;
      --success-tint: #e9ecdd;
      --success-border: #d2d9c0;
      --danger: #9c2b1f;
      --danger-tint: #f3e0da;
      --danger-border: #e6c4b8;
      --info: #3a5972;
      --info-tint: #e6e8e2;
      --info-border: #c9cabb;
      --radius: 7px;
      --radius-lg: 9px;
      --shadow-sm: 0 1px 2px rgba(20,16,10,.06), 0 1px 3px rgba(20,16,10,.05);
      --shadow-md: 0 6px 20px rgba(20,16,10,.10);
    }

    * { box-sizing: border-box; }
    html { background: var(--bg); }
    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--ink);
      background: var(--bg);
      -webkit-font-smoothing: antialiased;
    }
    ::selection { background: var(--accent-tint); color: var(--accent-strong); }

    /* ------------------------------------------------------------ */
    /* SHELL: sidebar + contenido                                    */
    /* ------------------------------------------------------------ */
    .dep-shell { display: flex; min-height: 100vh; }

    .dep-sidebar {
      width: 248px; flex-shrink: 0;
      background: var(--sidebar);
      color: var(--sidebar-text);
      display: flex; flex-direction: column;
      position: sticky; top: 0; height: 100vh;
      border-right: 1px solid var(--sidebar-line);
    }
    .dep-sidebar-brand {
      display: flex; align-items: center; gap: 11px;
      padding: 22px 20px 20px;
      border-bottom: 1px solid var(--sidebar-line);
    }
    .dep-sidebar-mark {
      width: 36px; height: 36px; border-radius: 8px;
      background: var(--accent); color: #1b1611;
      display: grid; place-items: center; flex-shrink: 0;
    }
    .dep-sidebar-brand h1 { margin: 0; font-size: 14.5px; font-weight: 800; letter-spacing: -.01em; color: #fbf6ee; line-height: 1.25; }
    .dep-sidebar-brand span { display: block; margin-top: 2px; font-size: 10.5px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--accent); }

    .dep-nav { flex: 1; padding: 14px 12px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
    .dep-nav-label { padding: 10px 10px 6px; font-size: 10.5px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: #7a705f; }
    .dep-navitem {
      display: flex; align-items: center; gap: 11px;
      border: none; background: transparent; cursor: pointer;
      font-family: inherit; font-weight: 600; font-size: 13.5px; color: var(--sidebar-text);
      padding: 10px 12px; border-radius: 6px; text-align: left; width: 100%;
      border-left: 3px solid transparent;
      transition: background .15s, color .15s, border-color .15s;
    }
    .dep-navitem svg { flex-shrink: 0; color: #8a7f6c; transition: color .15s; }
    .dep-navitem:hover { background: var(--sidebar-2); color: #fbf6ee; }
    .dep-navitem.active { background: var(--sidebar-2); color: #fbf6ee; border-left-color: var(--accent); }
    .dep-navitem.active svg { color: var(--accent); }

    .dep-sidebar-user {
      padding: 14px 16px; border-top: 1px solid var(--sidebar-line);
      display: flex; align-items: center; gap: 10px;
    }
    .dep-user-avatar {
      width: 32px; height: 32px; border-radius: 6px; flex-shrink: 0;
      background: var(--sidebar-2); border: 1px solid var(--sidebar-line);
      color: var(--accent); display: grid; place-items: center;
      font-size: 12px; font-weight: 800; text-transform: uppercase;
    }
    .dep-user-meta { min-width: 0; flex: 1; }
    .dep-user-name { font-size: 12.5px; font-weight: 700; color: #fbf6ee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dep-user-role { font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--accent); margin-top: 1px; }
    .dep-iconbtn {
      display: grid; place-items: center; width: 30px; height: 30px; flex-shrink: 0;
      border-radius: 6px; border: 1px solid var(--sidebar-line); background: transparent;
      color: #a79c88; cursor: pointer; transition: background .15s, color .15s, border-color .15s;
    }
    .dep-iconbtn:hover { background: var(--danger); color: #fff; border-color: var(--danger); }

    .dep-main { flex: 1; min-width: 0; }
    .dep-app { max-width: 1320px; margin: 0 auto; padding: 26px 2px 4px; }

    /* Encabezado de sección */
    .dep-pageheader {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
    }
    .dep-pageheader h2 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -.01em; color: var(--ink); }
    .dep-pageheader p { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
    .dep-actions { display: flex; gap: 8px; }

    /* Botones */
    .dep-btn {
      display: inline-flex; align-items: center; gap: 7px;
      font-family: inherit; font-weight: 600; font-size: 13.5px;
      padding: 9px 14px; border-radius: var(--radius); cursor: pointer;
      border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
      transition: background .15s, border-color .15s, transform .05s, box-shadow .15s;
      white-space: nowrap;
    }
    .dep-btn:hover { background: var(--line-2); border-color: #d8cdb9; }
    .dep-btn:active { transform: translateY(1px); }
    .dep-btn-primary { background: var(--ink); color: #fff; border-color: var(--ink); }
    .dep-btn-primary:hover { background: #000; border-color: #000; }
    .dep-btn-accent { background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 700; }
    .dep-btn-accent:hover { background: var(--accent-strong); border-color: var(--accent-strong); }
    .dep-btn-danger { background: var(--danger-tint); color: var(--danger); border-color: var(--danger-border); }
    .dep-btn-danger:hover { background: #ecd0c6; }

    /* Barra de herramientas / búsqueda */
    .dep-toolbar {
      display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
      background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--radius-lg); padding: 12px 14px; margin-bottom: 16px;
      box-shadow: var(--shadow-sm);
    }
    .dep-search { position: relative; flex: 1; min-width: 240px; }
    .dep-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); }
    .dep-search input {
      width: 100%; font-family: inherit; font-size: 14px;
      padding: 10px 12px 10px 36px; border-radius: var(--radius);
      border: 1px solid var(--line); background: var(--bg); color: var(--ink);
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .dep-search input:focus {
      outline: none; background: var(--surface);
      border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-tint);
    }
    .dep-count { font-size: 13px; color: var(--muted); font-weight: 500; }
    .dep-count strong { color: var(--ink); font-weight: 700; }

    /* Tabla */
    .dep-table-wrap {
      overflow-x: auto; background: var(--surface);
      border: 1px solid var(--line); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    table.dep-table { width: 100%; border-collapse: collapse; text-align: left; }
    .dep-table thead th {
      background: var(--bg); color: var(--muted);
      font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
      padding: 13px 16px; border-bottom: 1px solid var(--line);
      white-space: nowrap;
    }
    .dep-table thead th.sortable { cursor: pointer; user-select: none; }
    .dep-table thead th.sortable:hover { color: var(--ink); }
    .dep-th-inner { display: inline-flex; align-items: center; gap: 6px; }
    .dep-table tbody td { padding: 14px 16px; font-size: 13.5px; vertical-align: top; border-bottom: 1px solid var(--line-2); color: var(--ink-2); }
    .dep-table tbody tr:last-child td { border-bottom: none; }
    .dep-table tbody tr { transition: background .12s; }
    .dep-table tbody tr:hover { background: var(--accent-tint); }
    .dep-oc { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; font-family: ui-monospace, 'SF Mono', Consolas, monospace; font-size: 12.5px; }
    .dep-cell-muted { color: var(--muted); }
    .dep-inline { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .dep-inline svg { color: var(--muted); flex-shrink: 0; }
    .dep-due { color: var(--danger); font-weight: 600; }
    .dep-prov-name { color: var(--ink); font-weight: 600; }
    .dep-prov-mail { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }
    .dep-item {
      display: flex; justify-content: space-between; gap: 10px;
      font-size: 12px; padding: 3px 0; border-bottom: 1px dashed var(--line);
    }
    .dep-item:last-child { border-bottom: none; }
    .dep-item span { color: var(--muted); font-family: ui-monospace, 'SF Mono', Consolas, monospace; }
    .dep-item strong { color: var(--ink); font-variant-numeric: tabular-nums; }
    .dep-turno strong { color: var(--ink); font-variant-numeric: tabular-nums; }
    .dep-nowrap { white-space: nowrap; }
    .dep-row-actions { display: flex; gap: 6px; justify-content: flex-end; }

    /* Botones pequeños de acciones */
    .dep-abtn {
      display: inline-flex; align-items: center; gap: 5px;
      font-family: inherit; font-weight: 600; font-size: 12px;
      padding: 6px 10px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
      transition: background .15s, border-color .15s, transform .05s;
      white-space: nowrap;
    }
    .dep-abtn:hover { background: var(--line-2); }
    .dep-abtn:active { transform: translateY(1px); }
    .dep-abtn-info { background: var(--info-tint); color: var(--info); border-color: var(--info-border); }
    .dep-abtn-info:hover { background: #d9dbd2; }
    .dep-abtn-success { background: var(--success); color: #fff; border-color: var(--success); }
    .dep-abtn-success:hover { background: #335a19; }
    .dep-abtn-done { background: var(--success-tint); color: var(--success); border-color: var(--success-border); }

    /* Estados / mensajes */
    .dep-empty { padding: 40px 24px; text-align: center; color: var(--muted); font-size: 14px; }
    .dep-empty svg { color: var(--muted-2); margin-bottom: 8px; }
    .dep-alert {
      display: flex; align-items: center; gap: 9px;
      padding: 12px 16px; background: var(--danger-tint); color: var(--danger);
      border: 1px solid var(--danger-border); border-left: 3px solid var(--danger);
      border-radius: var(--radius); margin-bottom: 20px; font-size: 13.5px; font-weight: 500;
    }
    .dep-loading { color: var(--muted); font-size: 14px; padding: 4px 0 16px; }

    /* Pantalla de carga */
    .dep-splash {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; min-height: 100vh; background: var(--sidebar); color: var(--sidebar-text);
    }
    .dep-splash .dep-sidebar-mark { width: 52px; height: 52px; border-radius: 12px; }
    .dep-spinner {
      width: 22px; height: 22px; border: 2.5px solid var(--sidebar-line);
      border-top-color: var(--accent); border-radius: 50%;
      animation: dep-spin .8s linear infinite;
    }
    @keyframes dep-spin { to { transform: rotate(360deg); } }

    @media (max-width: 900px) {
      .dep-shell { flex-direction: column; }
      .dep-sidebar { width: 100%; height: auto; position: relative; flex-direction: row; align-items: center; padding: 0; }
      .dep-sidebar-brand { border-bottom: none; border-right: 1px solid var(--sidebar-line); padding: 14px 16px; }
      .dep-nav { flex-direction: row; overflow-x: auto; padding: 8px; }
      .dep-nav-label { display: none; }
      .dep-navitem { border-left: none; border-bottom: 3px solid transparent; white-space: nowrap; }
      .dep-navitem.active { border-left-color: transparent; border-bottom-color: var(--accent); }
      .dep-sidebar-user { border-top: none; border-left: 1px solid var(--sidebar-line); }
      .dep-app { padding: 20px 16px 48px; }
    }
  `}</style>
);

const OPCIONES_ESTADO = [
  { value: 'PENDIENTE_TURNO', label: 'Pendiente Turno' },
  { value: 'TURNO_SOLICITADO', label: 'Turno Solicitado' },
  { value: 'TURNO_CONFIRMADO', label: 'Turno Confirmado' },
  { value: 'ENTREGADO_PARCIAL', label: 'Entregado Parcial' },
  { value: 'ENTREGADO_TOTAL', label: 'Entregado Total' }
];

export default function App() {
  // --- ESTADOS DE SESIÓN Y AUTENTICACIÓN ---
  const [session, setSession] = useState(null);
  const [userPerfil, setUserPerfil] = useState(null);
  const [permisos, setPermisos] = useState([]); // Lista de módulo_id permitidos
  const [checkingAuth, setCheckingAuth] = useState(true);

  // --- ESTADO DE NAVEGACIÓN ---
  const [activeTab, setActiveTab] = useState('ORDENES');

  // --- DATOS Y FILTROS ---
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(
    OPCIONES_ESTADO.map((o) => o.value)
  );
  const [sortField, setSortField] = useState('fecha_emision');
  const [sortDir, setSortDir] = useState('desc');

  // --- MODALES ---
  const [isModalNuevaOpen, setIsModalNuevaOpen] = useState(false);
  const [selectedOcRecepcion, setSelectedOcRecepcion] = useState(null);
  const [selectedOcEditar, setSelectedOcEditar] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Helper para verificar si el usuario tiene un permiso específico
  const tienePermiso = (moduloId) => {
    if (userPerfil?.rol?.toUpperCase() === 'ADMIN') return true;
    return permisos.includes(moduloId);
  };

  // Cargar Perfil y sus Permisos desde la DB
  const cargarPerfilYPermisos = async (userId) => {
    try {
      // 1. Obtener Perfil del usuario
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('nombre, rol')
        .eq('id', userId)
        .maybeSingle();

      if (perfilError) {
        console.warn('Error leyendo el perfil del usuario:', perfilError.message);
      }

      if (!perfil) {
        // Si no se pudo leer el perfil, no asumimos ADMIN ni ningún otro rol:
        // dejamos al usuario sin permisos y avisamos, en vez de darle acceso por error.
        setUserPerfil(null);
        setPermisos([]);
        setError('No se pudo cargar tu perfil de usuario. Recargá la página o contactá a un administrador.');
        return;
      }

      setUserPerfil(perfil);
      const rolActual = perfil.rol;

      // 2. Si es ADMIN, asignamos acceso total sin necesidad de consultar la DB
      if (rolActual.toUpperCase() === 'ADMIN') {
        setPermisos([
          'ORDENES_VER', 'ORDENES_CREAR', 'TURNO_CONFIRMAR',
          'RECEPCION_MERCADERIA', 'CATALOGOS_GESTION',
          'CONFIGURACION_CUPOS', 'USUARIOS_ABM', 'REPORTES_VER'
        ]);
        return;
      }

      // 3. Consultar permisos para otros roles
      const { data: listaPermisos, error: permError } = await supabase
        .from('rol_permisos')
        .select('modulo_id')
        .eq('rol_id', rolActual);

      if (!permError && listaPermisos) {
        setPermisos(listaPermisos.map((p) => p.modulo_id));
      } else {
        console.warn('No se pudieron cargar permisos dinámicos:', permError);
        setPermisos([]);
      }
    } catch (err) {
      console.error('Error al cargar perfil y permisos:', err);
    }
  };

  // 1. Verificar Sesión al iniciar la App
  useEffect(() => {
    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          await cargarPerfilYPermisos(data.session.user.id);
        }
      } catch (err) {
        console.error('Error al verificar sesión:', err);
      } finally {
        setCheckingAuth(false);
      }
    }

    loadSession();

    // Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await cargarPerfilYPermisos(newSession.user.id);
      } else {
        setUserPerfil(null);
        setPermisos([]);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Cargar Órdenes de Compra
  const fetchOrdenes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOrdenesCompra();
      if (res.ok) {
        setOrdenes(res.data);
      } else {
        setError('Error al obtener la información.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchOrdenes();
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserPerfil(null);
    setPermisos([]);
  };

  // Ordenación y filtrado
  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const ordenesFiltradasYOrdenadas = useMemo(() => {
    const filtradas = ordenes.filter((oc) => {
      const estadoActual = oc.estado === 'ENTREGADO' ? 'ENTREGADO_TOTAL' : oc.estado;
      if (!estadosSeleccionados.includes(estadoActual)) return false;

      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const numeroOcMatch = oc.numero_oc?.toLowerCase().includes(query);
        const proveedorMatch = oc.proveedores?.nombre?.toLowerCase().includes(query);
        const skuMatch = oc.orden_compra_items?.some(
          (item) =>
            item.productos?.sku?.toLowerCase().includes(query) ||
            item.productos?.descripcion?.toLowerCase().includes(query)
        );

        return numeroOcMatch || proveedorMatch || skuMatch;
      }

      return true;
    });

    return filtradas.sort((a, b) => {
      let valA = a[sortField] || a.created_at?.split('T')[0] || '';
      let valB = b[sortField] || b.created_at?.split('T')[0] || '';

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [ordenes, estadosSeleccionados, searchTerm, sortField, sortDir]);

  const handleCopyLink = (oc) => {
    // 1. Obtener el token directamente de la Orden de Compra
    const token = oc.token_acceso;

    if (!token) {
      alert('Esta Orden de Compra no posee un token de acceso válido.');
      return;
    }

    // 2. Construir la URL limpia hacia el portal de agendamiento
    const link = `${window.location.origin}/agendar/${token}?oc=${oc.id}`;

    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(oc.id);
      setTimeout(() => setCopiedId(null), 2500);
    }).catch((err) => {
      console.error('Error al copiar el enlace:', err);
      alert('No se pudo copiar el enlace.');
    });
  };

  const handleConfirmarTurno = async (ocId) => {
    try {
      const res = await confirmarTurno(ocId);
      if (res.ok) fetchOrdenes();
    } catch (err) {
      alert('Error al confirmar el turno.');
    }
  };

  // --- VISTA 1: CARGANDO ---
  if (checkingAuth) {
    return (
      <>
        <GlobalStyles />
        <div className="dep-splash">
          <div className="dep-sidebar-mark"><IconPackage size={26} /></div>
          <div className="dep-spinner" role="status" aria-label="Cargando" />
          <p>Cargando aplicación...</p>
        </div>
      </>
    );
  }

  // --- VISTA 2: SI NO HAY SESIÓN, MOSTRAR LOGIN ---
  if (!session) {
    return (
      <>
        <GlobalStyles />
        <Login onLoginSuccess={(sess, perf) => { setSession(sess); setUserPerfil(perf); }} />
      </>
    );
  }

  const rol = userPerfil?.rol || 'DEPOSITO';
  const nombreUsuario = userPerfil?.nombre || session.user.email;
  const inicial = (nombreUsuario || '?').trim().charAt(0);

  const TABS = [
    { id: 'ORDENES', label: 'Órdenes de Compra', icon: IconClipboard, permiso: 'ORDENES_VER' },
    { id: 'CALENDARIO', label: 'Calendario de Turnos', icon: IconCalendar, permiso: 'ORDENES_VER' },
    { id: 'CATALOGOS', label: 'Catálogos', icon: IconGrid, permiso: 'CATALOGOS_GESTION' },
    { id: 'CONFIGURACION', label: 'Horarios y Cupos', icon: IconSettings, permiso: 'CONFIGURACION_CUPOS' },
    { id: 'USUARIOS', label: 'Usuarios', icon: IconUsers, permiso: 'USUARIOS_ABM' }
  ];

  const TAB_META = {
    ORDENES: { title: 'Órdenes de Compra', sub: 'Seguimiento de OCs, turnos y recepción de mercadería.' },
    CALENDARIO: { title: 'Calendario de Turnos', sub: 'Vista semanal de turnos agendados en el depósito.' },
    CATALOGOS: { title: 'Catálogos', sub: 'Productos y proveedores registrados en el sistema.' },
    CONFIGURACION: { title: 'Horarios y Cupos', sub: 'Disponibilidad de turnos de recepción por día.' },
    USUARIOS: { title: 'Usuarios', sub: 'Cuentas, roles y permisos de acceso al sistema.' }
  };

  return (
    <>
      <GlobalStyles />
      <div className="dep-shell">
        {/* BARRA LATERAL */}
        <aside className="dep-sidebar">
          <div className="dep-sidebar-brand">
            <div className="dep-sidebar-mark"><IconPackage size={19} /></div>
            <div>
              <h1>Control de Depósito</h1>
              <span>Consola logística</span>
            </div>
          </div>

          <nav className="dep-nav">
            <div className="dep-nav-label">Navegación</div>
            {TABS.filter((t) => tienePermiso(t.permiso)).map((t) => {
              const TabIcon = t.icon;
              return (
                <button
                  key={t.id}
                  className={`dep-navitem ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  <TabIcon size={17} /> {t.label}
                </button>
              );
            })}
          </nav>

          <div className="dep-sidebar-user">
            <div className="dep-user-avatar">{inicial}</div>
            <div className="dep-user-meta">
              <div className="dep-user-name">{nombreUsuario}</div>
              <div className="dep-user-role">{rol}</div>
            </div>
            <button className="dep-iconbtn" onClick={handleLogout} title="Cerrar sesión">
              <IconLogout size={15} />
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="dep-main">
          <div className="dep-app">
            <div className="dep-pageheader">
              <div>
                <h2>{TAB_META[activeTab]?.title}</h2>
                <p>{TAB_META[activeTab]?.sub}</p>
              </div>

              <div className="dep-actions">
                {tienePermiso('ORDENES_CREAR') && activeTab === 'ORDENES' && (
                  <button className="dep-btn dep-btn-accent" onClick={() => setIsModalNuevaOpen(true)}>
                    <IconPlus /> Nueva OC
                  </button>
                )}

                {activeTab === 'ORDENES' && (
                  <button className="dep-btn" onClick={fetchOrdenes}>
                    <IconRefresh /> Actualizar
                  </button>
                )}
              </div>
            </div>

        {/* PESTAÑA 1: ÓRDENES DE COMPRA */}
        {activeTab === 'ORDENES' && tienePermiso('ORDENES_VER') && (
          <>
            <div className="dep-toolbar">
              <div className="dep-search">
                <IconSearch />
                <input
                  type="text"
                  placeholder="Buscar por N° OC, Proveedor o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="dep-count">
                Mostrando <strong>{ordenesFiltradasYOrdenadas.length}</strong> de <strong>{ordenes.length}</strong> OCs
              </div>
            </div>

            {loading && <p className="dep-loading">Cargando Órdenes de Compra...</p>}
            {error && <div className="dep-alert">{error}</div>}

            {!loading && !error && (
              <div className="dep-table-wrap">
                <table className="dep-table">
                  <thead>
                    <tr>
                      <th>N° OC</th>
                      <th className="sortable" onClick={() => handleSortChange('fecha_emision')}>
                        <span className="dep-th-inner">
                          Emisión <IconChevron dir={sortField === 'fecha_emision' ? sortDir : 'updown'} />
                        </span>
                      </th>
                      <th className="sortable" onClick={() => handleSortChange('fecha_limite_entrega')}>
                        <span className="dep-th-inner">
                          Límite <IconChevron dir={sortField === 'fecha_limite_entrega' ? sortDir : 'updown'} />
                        </span>
                      </th>
                      <th>Proveedor</th>
                      <th>Insumos / Progreso</th>
                      <th>Turno Asignado</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesFiltradasYOrdenadas.length === 0 ? (
                      <tr>
                        <td colSpan="8">
                          <div className="dep-empty">
                            <IconInbox size={30} />
                            <div>No se encontraron Órdenes de Compra.</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      ordenesFiltradasYOrdenadas.map((oc) => {
                        let turno = null;
                        if (Array.isArray(oc.turnos) && oc.turnos.length > 0) {
                          turno = oc.turnos[oc.turnos.length - 1];
                        } else if (oc.turnos && typeof oc.turnos === 'object' && !Array.isArray(oc.turnos)) {
                          turno = oc.turnos;
                        }

                        const items = oc.orden_compra_items || [];
                        const fEmision = oc.fecha_emision || oc.created_at?.split('T')[0] || 'N/A';

                        return (
                          <tr key={oc.id}>
                            <td className="dep-oc">{oc.numero_oc}</td>
                            <td className="dep-nowrap">
                              <span className="dep-inline"><IconCalendar size={14} /> {fEmision}</span>
                            </td>
                            <td className="dep-nowrap">
                              <span className="dep-inline dep-due"><IconClock size={14} /> {oc.fecha_limite_entrega}</span>
                            </td>
                            <td>
                              <span className="dep-prov-name">{oc.proveedores?.nombre || 'Sin Proveedor'}</span>
                              <small className="dep-prov-mail">{oc.proveedores?.email_contacto}</small>
                            </td>
                            <td>
                              {items.map((item) => (
                                <div key={item.id} className="dep-item">
                                  <span>{item.productos?.sku}</span>
                                  <strong>{item.cantidad_recibida || 0} / {item.cantidad_solicitada}</strong>
                                </div>
                              ))}
                            </td>
                            <td>
                              {turno ? (
                                <div className="dep-turno">
                                  <span className="dep-inline"><IconCalendar size={14} /> <strong>{turno.fecha_turno}</strong></span>
                                  <div className="dep-cell-muted" style={{ fontSize: 12, marginTop: 2 }}>
                                    {turno.hora_inicio?.slice(0, 5)} hs
                                  </div>
                                </div>
                              ) : (
                                <span className="dep-cell-muted">Sin agendar</span>
                              )}
                            </td>
                            <td><EstadoBadge estado={oc.estado} /></td>
                            <td>
                              <div className="dep-row-actions">
                                {tienePermiso('ORDENES_CREAR') && (
                                  <>
                                    <button className="dep-abtn" onClick={() => setSelectedOcEditar(oc)}>
                                      <IconEdit size={13} /> Editar
                                    </button>
                                    <button
                                      className={`dep-abtn ${copiedId === oc.id ? 'dep-abtn-done' : ''}`}
                                      onClick={() => handleCopyLink(oc)}
                                    >
                                      {copiedId === oc.id ? <><IconCheck size={13} /> Copiado</> : <><IconLink size={13} /> Link</>}
                                    </button>
                                  </>
                                )}

                                {oc.estado === 'TURNO_SOLICITADO' && tienePermiso('TURNO_CONFIRMAR') && (
                                  <button className="dep-abtn dep-abtn-info" onClick={() => handleConfirmarTurno(oc.id)}>
                                    <IconCheck size={13} /> Confirmar
                                  </button>
                                )}

                                {(oc.estado === 'TURNO_CONFIRMADO' || oc.estado === 'ENTREGADO_PARCIAL') && tienePermiso('RECEPCION_MERCADERIA') && (
                                  <button className="dep-abtn dep-abtn-success" onClick={() => setSelectedOcRecepcion(oc)}>
                                    <IconPackage size={13} /> Recibir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* PESTAÑA 2: CALENDARIO */}
        {activeTab === 'CALENDARIO' && tienePermiso('ORDENES_VER') && <VistaCalendario />}

        {/* PESTAÑA 3: CATÁLOGOS */}
        {activeTab === 'CATALOGOS' && tienePermiso('CATALOGOS_GESTION') && <GestionCatalogos />}

        {/* PESTAÑA 4: CONFIGURACIÓN DE HORARIOS Y CUPOS */}
        {activeTab === 'CONFIGURACION' && tienePermiso('CONFIGURACION_CUPOS') && <ConfigDisponibilidad />}

        {/* PESTAÑA 5: GESTIÓN DE USUARIOS */}
        {activeTab === 'USUARIOS' && tienePermiso('USUARIOS_ABM') && <UsuariosABM />}

        {/* MODALES */}
        <ModalNuevaOC isOpen={isModalNuevaOpen} onClose={() => setIsModalNuevaOpen(false)} onOCCreated={fetchOrdenes} />
        <ModalRecepcion isOpen={!!selectedOcRecepcion} oc={selectedOcRecepcion} onClose={() => setSelectedOcRecepcion(null)} onRecepcionSuccess={fetchOrdenes} />
        <ModalEditarOC isOpen={!!selectedOcEditar} oc={selectedOcEditar} onClose={() => setSelectedOcEditar(null)} onOCUpdated={fetchOrdenes} />
          </div>
        </main>
      </div>
    </>
  );
}
