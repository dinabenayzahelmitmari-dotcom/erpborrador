import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarCheck,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  LayoutDashboard,
  Menu,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import type {
  ApprovalRequest,
  AuditEntry,
  BackupRecord,
  Company,
  Customer,
  DocumentItem,
  ErpProposalAction,
  Expense,
  Invoice,
  InvoiceLine,
  ModuleId,
  NotificationItem,
  OutboxEvent,
  PermissionAction,
  RoleDefinition,
  RoleId,
  Supplier,
  TaskItem,
  WorkflowRule,
} from './types/erp';
import { apiFetch, setApiContext } from './lib/api';
import { DashboardView } from './components/DashboardView';
import { CustomersSuppliersView } from './components/CustomersSuppliersView';
import { BillingView } from './components/BillingView';
import { ExpensesView } from './components/ExpensesView';
import { DocumentsView } from './components/DocumentsView';
import { AgendaView, ApprovalsView } from './components/AgendaApprovalsView';
import { AutomationView } from './components/AutomationView';
import { GeminiAssistantView } from './components/GeminiAssistantView';
import { NotificationsView } from './components/NotificationsView';
import { SystemSecurityView } from './components/SystemSecurityView';

interface BootstrapData {
  company: Company;
  companies: Array<{ id: string; name: string; nif: string; plan: string }>;
  role: RoleId;
  roleInfo: RoleDefinition;
  roles: Array<{ id: RoleId; name: string; description: string }>;
  actor: string;
  permissions: Record<ModuleId, PermissionAction[]>;
  kpis: {
    billedTotal: number;
    collectedTotal: number;
    pendingReceivable: number;
    overdueCount: number;
    expensesTotal: number;
    estimatedProfit: number;
    bankBalance: number;
    activeCustomers: number;
    activeSuppliers: number;
    pendingApprovals: number;
    unreadNotifications: number;
    pendingTasks: number;
  };
}

const NAV_GROUPS: Array<{
  group: string;
  items: Array<{ id: ModuleId; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    group: 'General',
    items: [
      { id: 'dashboard', label: 'Panel de control', icon: LayoutDashboard },
      { id: 'asistente', label: 'Asistente Gemini', icon: Sparkles },
      { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    ],
  },
  {
    group: 'Administración y finanzas',
    items: [
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'proveedores', label: 'Proveedores', icon: Truck },
      { id: 'facturacion', label: 'Facturación y PDF', icon: FileSpreadsheet },
      { id: 'gastos', label: 'Gastos y compras', icon: Receipt },
      { id: 'documentos', label: 'Documentos', icon: FolderArchive },
      { id: 'agenda', label: 'Agenda y tareas', icon: CalendarCheck },
      { id: 'aprobaciones', label: 'Aprobaciones', icon: CheckSquare },
    ],
  },
  {
    group: 'Control y sistema',
    items: [
      { id: 'automatizaciones', label: 'Flujos n8n', icon: Workflow },
      { id: 'sistema', label: 'Seguridad y copias', icon: ShieldCheck },
    ],
  },
];

export default function App() {
  const [companyId, setCompanyId] = useState('emp-iberica');
  const [role, setRole] = useState<RoleId>('direccion');
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [outboxEvents, setOutboxEvents] = useState<OutboxEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [systemData, setSystemData] = useState<{
    auditLogs: AuditEntry[];
    backups: BackupRecord[];
    roles: RoleDefinition[];
    enabledModules: ModuleId[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'ok' | 'error' } | null>(null);

  // Global search state
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; module: ModuleId; category: string; title: string; subtitle: string }>
  >([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string, type: 'ok' | 'error' = 'ok') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const loadAll = useCallback(async () => {
    setApiContext(companyId, role);
    try {
      const boot = await apiFetch<BootstrapData>('/api/bootstrap');
      setBootstrap(boot);

      const p = boot.permissions;
      const can = (mod: ModuleId) => p[mod]?.includes('ver');

      const [custRes, suppRes, invRes, expRes, docRes, taskRes, aprRes, wfRes, notRes, sysRes] =
        await Promise.all([
          can('clientes') ? apiFetch<{ items: Customer[] }>('/api/customers') : Promise.resolve({ items: [] }),
          can('proveedores') ? apiFetch<{ items: Supplier[] }>('/api/suppliers') : Promise.resolve({ items: [] }),
          can('facturacion') ? apiFetch<{ items: Invoice[] }>('/api/invoices') : Promise.resolve({ items: [] }),
          can('gastos') ? apiFetch<{ items: Expense[] }>('/api/expenses') : Promise.resolve({ items: [] }),
          can('documentos') ? apiFetch<{ items: DocumentItem[] }>('/api/documents') : Promise.resolve({ items: [] }),
          can('agenda') ? apiFetch<{ items: TaskItem[] }>('/api/tasks') : Promise.resolve({ items: [] }),
          can('aprobaciones') ? apiFetch<{ items: ApprovalRequest[] }>('/api/approvals') : Promise.resolve({ items: [] }),
          can('automatizaciones')
            ? apiFetch<{ workflows: WorkflowRule[]; outboxEvents: OutboxEvent[] }>('/api/workflows')
            : Promise.resolve({ workflows: [], outboxEvents: [] }),
          can('notificaciones')
            ? apiFetch<{ items: NotificationItem[] }>('/api/notifications')
            : Promise.resolve({ items: [] }),
          can('sistema')
            ? apiFetch<{
                auditLogs: AuditEntry[];
                backups: BackupRecord[];
                roles: RoleDefinition[];
                enabledModules: ModuleId[];
              }>('/api/system')
            : Promise.resolve(null),
        ]);

      setCustomers(custRes.items);
      setSuppliers(suppRes.items);
      setInvoices(invRes.items);
      setExpenses(expRes.items);
      setDocuments(docRes.items);
      setTasks(taskRes.items);
      setApprovals(aprRes.items);
      setWorkflows(wfRes.workflows);
      setOutboxEvents(wfRes.outboxEvents);
      setNotifications(notRes.items);
      setSystemData(sysRes);

      if (!can(activeModule) || !boot.company.enabledModules.includes(activeModule)) {
        setActiveModule('dashboard');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error cargando datos del ERP.', 'error');
    } finally {
      setLoading(false);
    }
  }, [companyId, role, activeModule, showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Global search debounce
  useEffect(() => {
    if (!globalQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<{
          results: Array<{ id: string; module: ModuleId; category: string; title: string; subtitle: string }>;
        }>(`/api/search?q=${encodeURIComponent(globalQuery)}`);
        setSearchResults(res.results);
      } catch {
        setSearchResults([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [globalQuery]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const canAction = (mod: ModuleId, action: PermissionAction): boolean => {
    return bootstrap?.permissions[mod]?.includes(action) ?? false;
  };

  // Action handlers
  const handleCreateCustomer = async (payload: {
    name: string;
    nif: string;
    email: string;
    phone: string;
    city: string;
    contactPerson: string;
  }) => {
    try {
      await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Cliente registrado correctamente.');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear cliente.', 'error');
      throw err;
    }
  };

  const handleCreateSupplier = async (payload: {
    name: string;
    nif: string;
    category: string;
    email: string;
    phone: string;
    contactPerson: string;
  }) => {
    try {
      await apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Proveedor registrado correctamente.');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear proveedor.', 'error');
      throw err;
    }
  };

  const handleCreateInvoice = async (payload: {
    type: 'Factura' | 'Presupuesto' | 'Rectificativa';
    customerId: string;
    dueDate: string;
    lines: InvoiceLine[];
    notes?: string;
  }) => {
    try {
      await apiFetch('/api/invoices', { method: 'POST', body: JSON.stringify(payload) });
      showToast(`${payload.type} emitida correctamente.`);
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al emitir documento.', 'error');
      throw err;
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await apiFetch(`/api/invoices/${invoiceId}/mark-paid`, { method: 'POST' });
      showToast('Cobro registrado y saldo bancario actualizado.');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al registrar cobro.', 'error');
    }
  };

  const handleCreateExpense = async (payload: {
    supplierName: string;
    supplierNif: string;
    concept: string;
    category: Expense['category'];
    costCenter: string;
    date: string;
    subtotal: number;
    vatAmount: number;
    source: 'Manual' | 'Extracción Gemini';
  }) => {
    try {
      const res = await apiFetch<{ item: Expense }>('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast(
        res.item.status === 'Pendiente'
          ? 'Gasto guardado y enviado a Aprobaciones (≥ 500 €).'
          : 'Gasto registrado y aprobado.'
      );
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar gasto.', 'error');
      throw err;
    }
  };

  const handleCreateDocument = async (payload: {
    title: string;
    folder: DocumentItem['folder'];
    fileName: string;
    linkedEntity: string;
    summary: string;
  }) => {
    try {
      await apiFetch('/api/documents', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Documento archivado en el repositorio.');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al archivar documento.', 'error');
      throw err;
    }
  };

  const handleCreateTask = async (payload: {
    title: string;
    dueDate: string;
    priority: TaskItem['priority'];
    category: TaskItem['category'];
  }) => {
    try {
      await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Tarea añadida a la agenda.');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear tarea.', 'error');
      throw err;
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      });
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar tarea.', 'error');
    }
  };

  const handleDecideApproval = async (id: string, decision: 'Aprobada' | 'Rechazada') => {
    try {
      await apiFetch(`/api/approvals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      showToast(`Solicitud ${decision.toLowerCase()} con trazabilidad registrada.`);
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al resolver solicitud.', 'error');
    }
  };

  const handleToggleWorkflow = async (id: string) => {
    try {
      await apiFetch(`/api/workflows/${id}/toggle`, { method: 'POST' });
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cambiar estado del flujo.', 'error');
    }
  };

  const handleRunWorkflow = async (id: string): Promise<string> => {
    try {
      const res = await apiFetch<{ summary: string }>(`/api/workflows/${id}/run`, { method: 'POST' });
      showToast('Flujo n8n ejecutado correctamente.');
      await loadAll();
      return res.summary;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error ejecutando flujo n8n.';
      showToast(msg, 'error');
      return msg;
    }
  };

  const handleSaveWebhookConfig = async (n8nWebhookUrl: string, n8nSecret: string) => {
    try {
      await apiFetch('/api/workflows/webhook-config', {
        method: 'PATCH',
        body: JSON.stringify({ n8nWebhookUrl, n8nSecret }),
      });
      showToast('Webhook de n8n guardado.');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error guardando configuración n8n.', 'error');
      throw err;
    }
  };

  const handleTestWebhook = async (): Promise<string> => {
    try {
      const res = await apiFetch<{ message: string }>('/api/workflows/test-webhook', { method: 'POST' });
      showToast(res.message);
      await loadAll();
      return res.message;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error probando webhook n8n.';
      showToast(msg, 'error');
      return msg;
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error actualizando notificación.', 'error');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error actualizando notificaciones.', 'error');
    }
  };

  const handleCreateBackup = async (type: 'Completa' | 'Incremental') => {
    try {
      await apiFetch('/api/backups', { method: 'POST', body: JSON.stringify({ type }) });
      showToast('Copia de seguridad creada y verificada.');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear copia de seguridad.', 'error');
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await apiFetch<Record<string, unknown>>('/api/backups/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo-${companyId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Respaldo JSON descargado.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sin permiso para exportar respaldo.', 'error');
    }
  };

  const handleToggleModule = async (modId: ModuleId) => {
    if (!bootstrap) return;
    const current = bootstrap.company.enabledModules;
    const next = current.includes(modId)
      ? current.filter((m) => m !== modId)
      : [...current, modId];
    try {
      await apiFetch('/api/company/modules', {
        method: 'PATCH',
        body: JSON.stringify({ enabledModules: next }),
      });
      showToast('Configuración modular actualizada.');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error actualizando módulos.', 'error');
    }
  };

  const handleConfirmGeminiProposal = async (proposal: ErpProposalAction) => {
    try {
      if (proposal.actionType === 'create_invoice_draft') {
        const d = proposal.data;
        await apiFetch('/api/invoices', {
          method: 'POST',
          body: JSON.stringify({
            type: d.type === 'Presupuesto' ? 'Presupuesto' : 'Factura',
            customerId: String(d.customerId || ''),
            customerName: String(d.customerName || 'Cliente'),
            customerNif: String(d.customerNif || ''),
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            status: 'Borrador',
            lines: [
              {
                description: String(d.description || 'Servicio propuesto'),
                quantity: 1,
                unitPrice: Number(d.unitPrice || 0),
                vatRate: 21,
              },
            ],
            notes: 'Borrador generado con asistencia de Gemini y confirmado por el usuario.',
          }),
        });
        showToast('Borrador guardado en Facturación.');
      } else if (proposal.actionType === 'create_task') {
        const d = proposal.data;
        await apiFetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: String(d.title),
            dueDate: String(d.dueDate),
            priority: d.priority,
            category: d.category,
            origin: 'Gemini',
          }),
        });
        showToast('Tarea guardada en Agenda.');
      }
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo ejecutar la acción.', 'error');
    }
  };

  const currentModuleLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeModule)?.label ?? 'Panel de control';

  if (loading && !bootstrap) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-base font-semibold text-slate-900">Núcleo ERP</p>
          <p className="text-sm text-slate-500">Cargando entorno empresarial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`no-print fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ${
          mobileMenuOpen
            ? 'translate-x-0 pointer-events-auto'
            : '-translate-x-full pointer-events-none lg:translate-x-0 lg:pointer-events-auto'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap">
            Núcleo ERP
          </span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-company & Role Selector (Clear & Always Visible) */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/70">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Empresa activa</label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {bootstrap?.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Perfil / Rol (RBAC)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleId)}
              className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
            >
              {bootstrap?.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) =>
                canAction(item.id, 'ver') &&
                (bootstrap?.company.enabledModules.includes(item.id) ?? true)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold text-slate-400">{group.group}</p>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.id;
                  const count =
                    item.id === 'aprobaciones'
                      ? bootstrap?.kpis.pendingApprovals ?? 0
                      : item.id === 'notificaciones'
                      ? bootstrap?.kpis.unreadNotifications ?? 0
                      : 0;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveModule(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {count > 0 && (
                        <span className="text-xs font-mono tabular-nums text-blue-700 font-semibold">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Signed-in actor summary */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-600">
          <p className="font-medium text-slate-900 truncate">{bootstrap?.actor}</p>
          <p className="text-slate-400 mt-0.5 truncate">
            NIF {bootstrap?.company.nif} · Plan {bootstrap?.company.plan}
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Top Workspace Bar */}
        <header className="no-print h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline truncate max-w-[180px]">
                {bootstrap?.company.name}
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900 truncate">{currentModuleLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Desktop Global Search */}
            <div ref={searchRef} className="relative hidden md:block w-64 lg:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setGlobalQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Buscar clientes, facturas, documentos..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />

              {searchOpen && globalQuery.trim() && (
                <div className="absolute right-0 mt-1.5 w-96 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 text-center">
                      Sin resultados para "{globalQuery}" en esta empresa.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {searchResults.map((r) => (
                        <button
                          key={`${r.module}-${r.id}`}
                          onClick={() => {
                            setActiveModule(r.module);
                            setSearchOpen(false);
                            setGlobalQuery('');
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-start gap-3"
                        >
                          <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{r.title}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {r.category} · {r.subtitle}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {canAction('notificaciones', 'ver') && (
              <button
                onClick={() => setActiveModule('notificaciones')}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Centro de notificaciones"
              >
                <Bell className="w-4 h-4" />
                {(bootstrap?.kpis.unreadNotifications ?? 0) > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-blue-700 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center">
                    {bootstrap?.kpis.unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {canAction('asistente', 'ver') && (
              <button
                onClick={() => setActiveModule('asistente')}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap min-h-[38px]"
                aria-label="Asistente Gemini"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Asistente Gemini</span>
              </button>
            )}
          </div>
        </header>

        {/* Expandable Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="no-print md:hidden bg-white border-b border-slate-200 px-3 py-2.5 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="Buscar clientes, facturas, documentos..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-700"
              />
              <button
                onClick={() => {
                  setMobileSearchOpen(false);
                  setGlobalQuery('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {globalQuery.trim() && (
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500 text-center">Sin resultados.</p>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={`mob-${r.module}-${r.id}`}
                      onClick={() => {
                        setActiveModule(r.module);
                        setMobileSearchOpen(false);
                        setGlobalQuery('');
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-2.5"
                    >
                      <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{r.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{r.category} · {r.subtitle}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="no-print fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-50 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 flex items-center justify-between gap-3">
            <span className={`text-xs font-medium ${toast.type === 'error' ? 'text-red-700' : 'text-slate-800'}`}>
              {toast.message}
            </span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 p-1 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {activeModule === 'dashboard' && bootstrap && (
            <DashboardView
              companyName={bootstrap.company.name}
              kpis={bootstrap.kpis}
              invoices={invoices}
              approvals={approvals}
              tasks={tasks}
              canApprove={canAction('aprobaciones', 'aprobar')}
              onNavigate={setActiveModule}
              onDecideApproval={handleDecideApproval}
              onMarkPaid={handleMarkPaid}
              onRefresh={loadAll}
            />
          )}

          {(activeModule === 'clientes' || activeModule === 'proveedores') && (
            <CustomersSuppliersView
              mode={activeModule}
              customers={customers}
              suppliers={suppliers}
              canCreate={canAction(activeModule, 'crear')}
              onCreateCustomer={handleCreateCustomer}
              onCreateSupplier={handleCreateSupplier}
            />
          )}

          {activeModule === 'facturacion' && bootstrap && (
            <BillingView
              company={bootstrap.company}
              invoices={invoices}
              customers={customers}
              canCreate={canAction('facturacion', 'crear')}
              canApprove={canAction('facturacion', 'aprobar')}
              onCreateInvoice={handleCreateInvoice}
              onMarkPaid={handleMarkPaid}
            />
          )}

          {activeModule === 'gastos' && (
            <ExpensesView
              expenses={expenses}
              canCreate={canAction('gastos', 'crear')}
              onCreateExpense={handleCreateExpense}
            />
          )}

          {activeModule === 'documentos' && (
            <DocumentsView
              documents={documents}
              canCreate={canAction('documentos', 'crear')}
              onCreateDocument={handleCreateDocument}
            />
          )}

          {activeModule === 'agenda' && (
            <AgendaView
              tasks={tasks}
              canCreate={canAction('agenda', 'crear')}
              canEdit={canAction('agenda', 'editar')}
              onCreateTask={handleCreateTask}
              onToggleTask={handleToggleTask}
            />
          )}

          {activeModule === 'aprobaciones' && (
            <ApprovalsView
              approvals={approvals}
              canApprove={canAction('aprobaciones', 'aprobar')}
              onDecide={handleDecideApproval}
            />
          )}

          {activeModule === 'automatizaciones' && bootstrap && (
            <AutomationView
              company={bootstrap.company}
              workflows={workflows}
              outboxEvents={outboxEvents}
              canEdit={canAction('automatizaciones', 'editar')}
              onToggleWorkflow={handleToggleWorkflow}
              onRunWorkflow={handleRunWorkflow}
              onSaveWebhookConfig={handleSaveWebhookConfig}
              onTestWebhook={handleTestWebhook}
            />
          )}

          {activeModule === 'asistente' && bootstrap && (
            <GeminiAssistantView
              companyName={bootstrap.company.name}
              role={role}
              roleName={bootstrap.roleInfo.name}
              onConfirmProposal={handleConfirmGeminiProposal}
            />
          )}

          {activeModule === 'notificaciones' && (
            <NotificationsView
              notifications={notifications}
              canEdit={canAction('notificaciones', 'editar')}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          )}

          {activeModule === 'sistema' && systemData && (
            <SystemSecurityView
              auditLogs={systemData.auditLogs}
              backups={systemData.backups}
              roles={systemData.roles}
              enabledModules={systemData.enabledModules}
              canCreateBackup={canAction('sistema', 'crear')}
              canEditConfig={canAction('sistema', 'editar')}
              canExport={canAction('sistema', 'exportar')}
              onCreateBackup={handleCreateBackup}
              onExportBackup={handleExportBackup}
              onToggleModule={handleToggleModule}
            />
          )}
        </main>
      </div>
    </div>
  );
}
