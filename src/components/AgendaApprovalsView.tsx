import { useState } from 'react';
import { Calendar, Check, CheckSquare, Plus, Square, X } from 'lucide-react';
import type { ApprovalRequest, TaskItem } from '../types/erp';
import { formatDateES, formatEUR } from '../lib/api';
import { StatusText } from './StatusText';

interface AgendaViewProps {
  tasks: TaskItem[];
  canCreate: boolean;
  canEdit: boolean;
  onCreateTask: (payload: {
    title: string;
    dueDate: string;
    priority: TaskItem['priority'];
    category: TaskItem['category'];
  }) => Promise<void>;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void>;
}

export function AgendaView({ tasks, canCreate, canEdit, onCreateTask, onToggleTask }: AgendaViewProps) {
  const [filter, setFilter] = useState<'Pendientes' | 'Completadas' | 'Todas'>('Pendientes');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    dueDate: new Date().toISOString().slice(0, 10),
    priority: 'Media' as TaskItem['priority'],
    category: 'Operación' as TaskItem['category'],
  });
  const [submitting, setSubmitting] = useState(false);

  const filtered = tasks.filter((t) => {
    if (filter === 'Pendientes') return !t.completed;
    if (filter === 'Completadas') return t.completed;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateTask(form);
      setShowCreate(false);
      setForm({ title: '', dueDate: new Date().toISOString().slice(0, 10), priority: 'Media', category: 'Operación' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agenda y tareas</h1>
          <p className="text-sm text-slate-600 mt-1">
            Vencimientos, recordatorios operativos y tareas generadas automáticamente por flujos n8n o Gemini.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva tarea</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit max-w-full overflow-x-auto">
        {(['Pendientes', 'Completadas', 'Todas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No hay tareas en esta vista.
          </div>
        ) : (
          filtered.map((task) => (
            <div key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <button
                  disabled={!canEdit}
                  onClick={() => onToggleTask(task.id, !task.completed)}
                  className="mt-0.5 text-slate-500 hover:text-blue-700 disabled:opacity-40 shrink-0"
                  aria-label={task.completed ? 'Reabrir tarea' : 'Completar tarea'}
                >
                  {task.completed ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="min-w-0">
                  <p className={`text-sm font-medium break-words ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 break-words">
                    {task.category} · Prioridad {task.priority} · Responsable: {task.assignee} · Origen: {task.origin}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-600 shrink-0 pl-8 sm:pl-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDateES(task.dueDate)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md max-h-[92dvh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900">Añadir tarea a agenda</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción de la tarea *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej. Confirmar transferencia a proveedor"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha límite</label>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Prioridad</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as TaskItem['priority'] })}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as TaskItem['category'] })}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Operación">Operación</option>
                    <option value="Cobro">Cobro</option>
                    <option value="Contrato">Contrato</option>
                    <option value="Fiscal">Fiscal</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface ApprovalsViewProps {
  approvals: ApprovalRequest[];
  canApprove: boolean;
  onDecide: (id: string, decision: 'Aprobada' | 'Rechazada') => Promise<void>;
}

export function ApprovalsView({ approvals, canApprove, onDecide }: ApprovalsViewProps) {
  const [filter, setFilter] = useState<'Pendiente' | 'Resueltas' | 'Todas'>('Pendiente');

  const filtered = approvals.filter((a) => {
    if (filter === 'Pendiente') return a.status === 'Pendiente';
    if (filter === 'Resueltas') return a.status !== 'Pendiente';
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Circuito de aprobaciones</h1>
        <p className="text-sm text-slate-600 mt-1">
          Control humano obligatorio para gastos elevados, recordatorios legales y operaciones propuestas por automatizaciones.
        </p>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit max-w-full overflow-x-auto">
        {(['Pendiente', 'Resueltas', 'Todas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No hay solicitudes en esta bandeja.
          </div>
        ) : (
          filtered.map((apr) => (
            <div key={apr.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-medium text-slate-500">{apr.type}</span>
                  <span className="text-slate-300">·</span>
                  <StatusText status={apr.status} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 break-words">{apr.title}</h3>
                <p className="text-sm text-slate-600 break-words">{apr.description}</p>
                <p className="text-xs text-slate-400 break-words">
                  Solicitado por {apr.requestedBy} · {apr.createdAt}
                  {apr.decidedBy && ` · Resuelto por ${apr.decidedBy} (${apr.decidedAt})`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                {typeof apr.amount === 'number' && (
                  <span className="text-base font-mono tabular-nums font-bold text-slate-900">
                    {formatEUR(apr.amount)}
                  </span>
                )}
                {apr.status === 'Pendiente' && canApprove && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDecide(apr.id, 'Rechazada')}
                      className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => onDecide(apr.id, 'Aprobada')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aprobar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
