import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { ApprovalRequest, Invoice, ModuleId, TaskItem } from '../types/erp';
import { apiFetch, formatDateES, formatEUR } from '../lib/api';
import { StatusText } from './StatusText';

interface DashboardKpis {
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
}

interface DashboardViewProps {
  companyName: string;
  kpis: DashboardKpis;
  invoices: Invoice[];
  approvals: ApprovalRequest[];
  tasks: TaskItem[];
  canApprove: boolean;
  onNavigate: (module: ModuleId) => void;
  onDecideApproval: (id: string, decision: 'Aprobada' | 'Rechazada') => Promise<void>;
  onMarkPaid: (invoiceId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const MONTHLY_SERIES = [
  { month: 'Jun', ingresos: 31200, gastos: 14800 },
  { month: 'Jul', ingresos: 34800, gastos: 16200 },
  { month: 'Ago', ingresos: 26500, gastos: 13900 },
  { month: 'Sep', ingresos: 38900, gastos: 18400 },
  { month: 'Oct', ingresos: 42100, gastos: 19600 },
  { month: 'Nov', ingresos: 41745, gastos: 14931 },
];

export function DashboardView({
  companyName,
  kpis,
  invoices,
  approvals,
  tasks,
  canApprove,
  onNavigate,
  onDecideApproval,
  onMarkPaid,
}: DashboardViewProps) {
  const [briefing, setBriefing] = useState<{
    summary: string;
    highlights: Array<{ title: string; detail: string; level: string }>;
  } | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const handleGenerateBriefing = async () => {
    setLoadingBriefing(true);
    setBriefingError(null);
    try {
      const data = await apiFetch<{
        summary: string;
        highlights: Array<{ title: string; detail: string; level: string }>;
      }>('/api/ai/briefing', { method: 'POST' });
      setBriefing(data);
    } catch (err) {
      setBriefingError(err instanceof Error ? err.message : 'No se pudo generar el resumen.');
    } finally {
      setLoadingBriefing(false);
    }
  };

  const pendingApprovalsList = approvals.filter((a) => a.status === 'Pendiente');
  const pendingTasksList = tasks.filter((t) => !t.completed).slice(0, 4);
  const priorityInvoices = invoices.filter((i) => i.status === 'Vencida' || i.status === 'Pendiente').slice(0, 4);

  const maxChartVal = Math.max(...MONTHLY_SERIES.map((m) => m.ingresos), 45000);

  return (
    <div className="space-y-8">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Centro de control · {companyName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Resumen operativo, tesorería, vencimientos y aprobaciones pendientes en un vistazo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('asistente')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-blue-700" />
            <span>Preguntar a Gemini</span>
          </button>
          <button
            onClick={() => onNavigate('facturacion')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Nueva factura</span>
          </button>
        </div>
      </div>

      {/* Simple Time-Saving Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('gastos')}
          className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-700 transition-colors"
        >
          <p className="text-sm font-semibold text-slate-900">Subir ticket / factura</p>
          <p className="text-xs text-slate-500 mt-0.5">Gemini rellena el gasto por ti</p>
        </button>
        <button
          onClick={() => onNavigate('facturacion')}
          className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-700 transition-colors"
        >
          <p className="text-sm font-semibold text-slate-900">Facturar o duplicar</p>
          <p className="text-xs text-slate-500 mt-0.5">Emite o repite en 1 clic</p>
        </button>
        <button
          onClick={() => onNavigate('aprobaciones')}
          className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-700 transition-colors"
        >
          <p className="text-sm font-semibold text-slate-900">Revisar aprobaciones</p>
          <p className="text-xs text-slate-500 mt-0.5">{kpis.pendingApprovals} pendiente(s) de firma</p>
        </button>
        <button
          onClick={() => onNavigate('automatizaciones')}
          className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-700 transition-colors"
        >
          <p className="text-sm font-semibold text-slate-900">Conectar n8n</p>
          <p className="text-xs text-slate-500 mt-0.5">Automatiza avisos y facturas</p>
        </button>
      </div>

      {/* 4-Column Unified KPI Strip (Single elevation, clean dividers, tabular-nums) */}
      <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 sm:p-6">
          <p className="text-xs font-medium text-slate-500">Facturación emitida</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {formatEUR(kpis.billedTotal)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Cobrado: <span className="font-mono tabular-nums text-emerald-700 font-medium">{formatEUR(kpis.collectedTotal)}</span>
          </p>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-xs font-medium text-slate-500">Gastos registrados</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {formatEUR(kpis.expensesTotal)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Proveedores activos: <span className="font-mono tabular-nums text-slate-700 font-medium">{kpis.activeSuppliers}</span>
          </p>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-xs font-medium text-slate-500">Beneficio estimado</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {formatEUR(kpis.estimatedProfit)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Pendiente de cobro:{' '}
            <span className="font-mono tabular-nums text-amber-700 font-medium">
              {formatEUR(kpis.pendingReceivable)}
            </span>
          </p>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-xs font-medium text-slate-500">Saldo disponible en banco</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-blue-700 mt-2">
            {formatEUR(kpis.bankBalance)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {kpis.overdueCount > 0 ? (
              <span className="text-red-700 font-medium">{kpis.overdueCount} factura(s) vencida(s)</span>
            ) : (
              <span className="text-emerald-700 font-medium">Sin facturas vencidas</span>
            )}
          </p>
        </div>
      </section>

      {/* Main Split: Chart + Gemini Executive Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Evolution Chart */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Evolución de facturación y gastos</h2>
              <p className="text-xs text-slate-500 mt-0.5">Comparativa semestral en euros (datos contables)</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-700 inline-block" />
                Ingresos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
                Gastos
              </span>
            </div>
          </div>

          <div className="relative h-56 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 border-b border-slate-200 pb-2">
            {MONTHLY_SERIES.map((item, idx) => {
              const incH = Math.round((item.ingresos / maxChartVal) * 165);
              const expH = Math.round((item.gastos / maxChartVal) * 165);
              const isHovered = hoveredMonth === idx;
              return (
                <div
                  key={item.month}
                  onMouseEnter={() => setHoveredMonth(idx)}
                  onMouseLeave={() => setHoveredMonth(null)}
                  onClick={() => setHoveredMonth(isHovered ? null : idx)}
                  className="flex-1 flex flex-col items-center gap-2 group relative cursor-default min-w-0"
                >
                  {isHovered && (
                    <div
                      className={`absolute -top-11 z-10 bg-slate-900 text-white text-[11px] rounded-md px-2 py-1 whitespace-nowrap shadow-md pointer-events-none ${
                        idx === 0 ? 'left-0' : idx === MONTHLY_SERIES.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                      }`}
                    >
                      <span className="font-mono tabular-nums">{item.month}: +{formatEUR(item.ingresos)}</span>
                    </div>
                  )}
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    <div
                      style={{ height: `${incH}px` }}
                      className="w-3.5 sm:w-6 bg-blue-700 group-hover:bg-blue-800 rounded-t transition-colors"
                    />
                    <div
                      style={{ height: `${expH}px` }}
                      className="w-3.5 sm:w-6 bg-slate-300 group-hover:bg-slate-400 rounded-t transition-colors"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{item.month}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-4">
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Clientes activos: <strong className="text-slate-800 font-mono">{kpis.activeCustomers}</strong>
            </span>
            <button
              onClick={() => onNavigate('facturacion')}
              className="text-blue-700 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              <span>Ver todas las facturas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Gemini Executive Briefing */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Análisis proactivo con Gemini</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lectura en tiempo real bajo permisos del rol activo
                </p>
              </div>
              <button
                onClick={handleGenerateBriefing}
                disabled={loadingBriefing}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {loadingBriefing ? 'Analizando...' : briefing ? 'Actualizar análisis' : 'Analizar ahora'}
              </button>
            </div>

            {briefingError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {briefingError}
              </div>
            )}

            {!briefing && !loadingBriefing && !briefingError && (
              <div className="mt-6 space-y-3 text-sm text-slate-600">
                <p>
                  Pulsa <strong>Analizar ahora</strong> para que Gemini revise las facturas pendientes, vencimientos, gastos y saldo de esta empresa.
                </p>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                  <p>• {kpis.pendingApprovals} aprobación(es) esperando revisión humana</p>
                  <p>• {kpis.pendingTasks} tarea(s) abiertas en agenda</p>
                  <p>• {kpis.overdueCount} factura(s) con vencimiento superado</p>
                </div>
              </div>
            )}

            {loadingBriefing && (
              <div className="mt-6 space-y-3 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-5/6" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-14 bg-slate-100 rounded w-full mt-4" />
                <div className="h-14 bg-slate-100 rounded w-full" />
              </div>
            )}

            {briefing && !loadingBriefing && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed">{briefing.summary}</p>
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {briefing.highlights.map((h, i) => (
                    <div key={i} className="py-2.5 flex items-start gap-2.5">
                      {h.level === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : h.level === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{h.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{h.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500">Asistente conectado a herramientas ERP</span>
            <button
              onClick={() => onNavigate('asistente')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <span>Abrir chat completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* Bottom Operational Row: Pending Approvals + Priority Invoices + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Aprobaciones pendientes</h2>
              <p className="text-xs text-slate-500">Acciones con impacto económico que requieren autorización</p>
            </div>
            <button
              onClick={() => onNavigate('aprobaciones')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              Ver cola completa
            </button>
          </div>

          {pendingApprovalsList.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No hay solicitudes pendientes de aprobación en este momento.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingApprovalsList.map((apr) => (
                <div key={apr.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{apr.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {apr.type} · {apr.requestedBy} · {apr.createdAt}
                    </p>
                  </div>
                  {canApprove ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onDecideApproval(apr.id, 'Rechazada')}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => onDecideApproval(apr.id, 'Aprobada')}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
                      >
                        Aprobar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Requiere permiso de aprobación</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Priority Invoices & Tasks */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Vencimientos y tareas próximas</h2>
              <p className="text-xs text-slate-500">Cobros pendientes y agenda operativa</p>
            </div>
            <button
              onClick={() => onNavigate('agenda')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              Ir a agenda
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {priorityInvoices.map((inv) => (
              <div key={inv.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    <span className="font-mono text-xs text-slate-500 mr-2">{inv.number}</span>
                    {inv.customerName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vence {formatDateES(inv.dueDate)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <StatusText status={inv.status} />
                  <span className="text-sm font-mono tabular-nums font-semibold text-slate-900">
                    {formatEUR(inv.total)}
                  </span>
                  {canApprove && inv.type === 'Factura' && (
                    <button
                      onClick={() => onMarkPaid(inv.id)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100"
                    >
                      Cobrar
                    </button>
                  )}
                </div>
              </div>
            ))}
            {pendingTasksList.map((t) => (
              <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 break-words">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.category} · {t.assignee} · Origen: {t.origin}
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-600 shrink-0">
                  {formatDateES(t.dueDate)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
