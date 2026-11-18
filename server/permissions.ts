import type { ModuleId, PermissionAction, RoleDefinition, RoleId } from '../src/types/erp.ts';

export const ROLES: Record<RoleId, RoleDefinition> = {
  direccion: {
    id: 'direccion',
    name: 'Dirección General',
    description: 'Acceso completo a indicadores, aprobaciones económicas, configuración y copias de seguridad.',
    permissions: {
      dashboard: ['ver', 'exportar'],
      clientes: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
      proveedores: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
      facturacion: ['ver', 'crear', 'editar', 'aprobar', 'exportar'],
      gastos: ['ver', 'crear', 'editar', 'aprobar', 'exportar'],
      documentos: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
      agenda: ['ver', 'crear', 'editar', 'eliminar'],
      aprobaciones: ['ver', 'aprobar'],
      automatizaciones: ['ver', 'crear', 'editar'],
      asistente: ['ver', 'crear'],
      notificaciones: ['ver', 'editar'],
      sistema: ['ver', 'crear', 'editar', 'exportar'],
    },
  },
  administracion: {
    id: 'administracion',
    name: 'Administración',
    description: 'Gestión diaria de clientes, proveedores, facturación, documentos, gastos y agenda.',
    permissions: {
      dashboard: ['ver'],
      clientes: ['ver', 'crear', 'editar', 'exportar'],
      proveedores: ['ver', 'crear', 'editar', 'exportar'],
      facturacion: ['ver', 'crear', 'editar', 'exportar'],
      gastos: ['ver', 'crear', 'editar'],
      documentos: ['ver', 'crear', 'editar', 'exportar'],
      agenda: ['ver', 'crear', 'editar'],
      aprobaciones: ['ver'],
      automatizaciones: ['ver'],
      asistente: ['ver', 'crear'],
      notificaciones: ['ver', 'editar'],
      sistema: ['ver'],
    },
  },
  contabilidad: {
    id: 'contabilidad',
    name: 'Contabilidad y Finanzas',
    description: 'Control de facturas, cobros, gastos, aprobaciones financieras y exportación fiscal.',
    permissions: {
      dashboard: ['ver', 'exportar'],
      clientes: ['ver', 'exportar'],
      proveedores: ['ver', 'exportar'],
      facturacion: ['ver', 'crear', 'editar', 'aprobar', 'exportar'],
      gastos: ['ver', 'crear', 'editar', 'aprobar', 'exportar'],
      documentos: ['ver', 'crear', 'exportar'],
      agenda: ['ver', 'crear'],
      aprobaciones: ['ver', 'aprobar'],
      automatizaciones: ['ver'],
      asistente: ['ver', 'crear'],
      notificaciones: ['ver', 'editar'],
      sistema: ['ver', 'exportar'],
    },
  },
  comercial: {
    id: 'comercial',
    name: 'Comercial',
    description: 'Consulta de clientes, creación de presupuestos y seguimiento de agenda comercial.',
    permissions: {
      dashboard: ['ver'],
      clientes: ['ver', 'crear', 'editar'],
      proveedores: [],
      facturacion: ['ver', 'crear'],
      gastos: [],
      documentos: ['ver'],
      agenda: ['ver', 'crear', 'editar'],
      aprobaciones: [],
      automatizaciones: [],
      asistente: ['ver'],
      notificaciones: ['ver', 'editar'],
      sistema: [],
    },
  },
  auditor: {
    id: 'auditor',
    name: 'Auditoría (Solo lectura)',
    description: 'Inspección de registros, facturas, trazabilidad y copias de seguridad sin capacidad de modificación.',
    permissions: {
      dashboard: ['ver', 'exportar'],
      clientes: ['ver', 'exportar'],
      proveedores: ['ver', 'exportar'],
      facturacion: ['ver', 'exportar'],
      gastos: ['ver', 'exportar'],
      documentos: ['ver', 'exportar'],
      agenda: ['ver'],
      aprobaciones: ['ver'],
      automatizaciones: ['ver'],
      asistente: ['ver'],
      notificaciones: ['ver'],
      sistema: ['ver', 'exportar'],
    },
  },
};

export function hasPermission(role: RoleId, module: ModuleId, action: PermissionAction): boolean {
  const def = ROLES[role];
  if (!def) return false;
  return def.permissions[module]?.includes(action) ?? false;
}

export function getRolePermissions(role: RoleId): Record<ModuleId, PermissionAction[]> {
  return ROLES[role]?.permissions ?? ROLES.administracion.permissions;
}
