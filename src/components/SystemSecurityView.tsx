import { useState } from 'react';
import { Database, Download, HardDrive, Shield } from 'lucide-react';
import type { AuditEntry, BackupRecord, ModuleId, RoleDefinition } from '../types/erp';
import { StatusText } from './StatusText';

interface SystemSecurityViewProps {
  auditLogs: AuditEntry[];
  backups: BackupRecord[];
  roles: RoleDefinition[];
  enabledModules: ModuleId[];
  canCreateBackup: boolean;
  canEditConfig: boolean;
  canExport: boolean;
  onCreateBackup: (type: 'Completa' | 'Incremental') => Promise<void>;
  onExportBackup: () => void;
  onToggleModule: (moduleId: ModuleId) => Promise<void>;
}

const CONFIGURABLE_MODULES: Array<{ id: ModuleId; label: string; description: string }> = [
  { id: 'clientes', label: 'Clientes', description: 'Ficha fiscal, contactos e historial de facturación.' },
  { id: 'proveedores', label: 'Proveedores', description: 'Directorio de proveedores, homologación y compras.' },
  { id: 'facturacion', label: 'Facturación y PDF', description: 'Facturas, presupuestos, cobros y generación documental.' },
  { id: 'gastos', label: 'Gastos y compras', description: 'Tickets, centros de coste y extracción Gemini.' },
  { id: 'documentos', label: 'Gestión documental', description: 'Carpetas, versiones y archivo corporativo.' },
  { id: 'agenda', label: 'Agenda y tareas', description: 'Vencimientos, recordatorios y tareas operativas.' },
  { id: 'aprobaciones', label: 'Aprobaciones', description: 'Circuito de autorización humana.' },
  { id: 'automatizaciones', label: 'Flujos n8n', description: 'Eventos Outbox y procesos automatizados.' },
  { id: 'asistente', label: 'Asistente Gemini', description: 'Capa inteligente bajo control de permisos.' },
];

export function SystemSecurityView({
  auditLogs,
  backups,
  roles,
  enabledModules,
  canCreateBackup,
  canEditConfig,
  canExport,
  onCreateBackup,
  onExportBackup,
  onToggleModule,
}: SystemSecurityViewProps) {
  const [tab, setTab] = useState<'backups' | 'auditoria' | 'permisos' | 'modulos'>('backups');
  const [creatingBackup, setCreatingBackup] = useState(false);

  const handleBackup = async (type: 'Completa' | 'Incremental') => {
    setCreatingBackup(true);
    try {
      await onCreateBackup(type);
    } finally {
      setCreatingBackup(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Seguridad, trazabilidad y copias</h1>
        <p className="text-sm text-slate-600 mt-1">
          Control de permisos verificado en backend, registro de auditoría, copias de seguridad y configuración modular por empresa.
        </p>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto max-w-full">
        {[
          { id: 'backups', label: 'Backups y continuidad' },
          { id: 'auditoria', label: 'Registro de auditoría' },
          { id: 'permisos', label: 'Matriz de roles' },
          { id: 'modulos', label: 'Módulos activos' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'backups' && (
        <div className="space-y-6">
          {/* RPO/RTO Objectives */}
          <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-5">
              <p className="text-xs text-slate-500">Objetivo RPO (Pérdida máxima)</p>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">Hasta 5 min</p>
              <p className="text-xs text-slate-500 mt-1">Copias incrementales y archivo S3</p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Objetivo RTO (Recuperación)</p>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">Hasta 4 horas</p>
              <p className="text-xs text-slate-500 mt-1">Restauración verificada por simulacro</p>
            </div>
            <div className="p-5 flex flex-col justify-between gap-3">
              <p className="text-xs text-slate-500">Acciones de continuidad</p>
              <div className="flex flex-wrap items-center gap-2">
                {canCreateBackup && (
                  <button
                    disabled={creatingBackup}
                    onClick={() => handleBackup('Incremental')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>{creatingBackup ? 'Creando...' : 'Crear copia ahora'}</span>
                  </button>
                )}
                {canExport && (
                  <button
                    onClick={onExportBackup}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar JSON</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Backups History */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="md:hidden divide-y divide-slate-100">
              {backups.map((b) => (
                <div key={`mob-${b.id}`} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{b.type}</span>
                    <StatusText status={b.integrityStatus} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono">
                    <span>{b.createdAt}</span>
                    <span className="font-semibold text-slate-700">{b.sizeMb} MB</span>
                  </div>
                  <p className="text-xs font-mono text-slate-500 break-all">{b.storageTarget}</p>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Fecha y hora</th>
                    <th className="py-3 px-4">Tipo de copia</th>
                    <th className="py-3 px-4">Destino</th>
                    <th className="py-3 px-4 text-right">Tamaño</th>
                    <th className="py-3 px-4">Integridad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{b.createdAt}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{b.type}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{b.storageTarget}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{b.sizeMb} MB</td>
                      <td className="py-3 px-4">
                        <StatusText status={b.integrityStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'auditoria' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="md:hidden divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={`mob-${log.id}`} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 truncate">{log.actor}</span>
                  <span className="text-xs text-slate-500 capitalize shrink-0">{log.module}</span>
                </div>
                <p className="text-sm text-slate-700 break-words">{log.action}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500">
                  <span className="break-all">{log.target}</span>
                  <span className="shrink-0">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Marca de tiempo</th>
                  <th className="py-3 px-4">Usuario / Actor</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Acción realizada</th>
                  <th className="py-3 px-4">Registro afectado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{log.actor}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 capitalize">{log.module}</td>
                    <td className="py-2.5 px-4 text-slate-800">{log.action}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{log.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'permisos' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {roles.map((r) => (
            <div key={r.id} className="p-4 sm:p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 inline-flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>{r.name}</span>
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">{r.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {Object.entries(r.permissions).map(([mod, actions]) => (
                  <div key={mod} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <span className="font-medium text-slate-800 capitalize block">{mod}</span>
                    <span className="text-slate-500 mt-0.5 block break-words">
                      {actions.length > 0 ? actions.join(', ') : 'Sin acceso'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'modulos' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="p-4 sm:p-5 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Configuración modular de la organización</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Los módulos desactivados se ocultan del menú lateral sin eliminar ni alterar los datos almacenados.
            </p>
          </div>
          {CONFIGURABLE_MODULES.map((m) => {
            const active = enabledModules.includes(m.id);
            return (
              <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{m.label}</p>
                  <p className="text-xs text-slate-500">{m.description}</p>
                </div>
                <button
                  disabled={!canEditConfig}
                  onClick={() => onToggleModule(m.id)}
                  className={`self-start sm:self-auto px-3.5 py-2 sm:py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap disabled:opacity-50 ${
                    active
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {active ? 'Activo' : 'Oculto'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
