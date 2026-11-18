import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import type { NotificationItem } from '../types/erp';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  canEdit: boolean;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

export function NotificationsView({
  notifications,
  canEdit,
  onMarkRead,
  onMarkAllRead,
}: NotificationsViewProps) {
  const [catFilter, setCatFilter] = useState('Todas');
  const categories = ['Todas', 'Finanzas', 'Administración', 'Personas y tareas', 'Sistema y seguridad'];

  const filtered = notifications.filter((n) => catFilter === 'Todas' || n.category === catFilter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Centro de notificaciones</h1>
          <p className="text-sm text-slate-600 mt-1">
            Avisos de negocio, vencimientos financieros, flujos n8n y alertas de seguridad.
          </p>
        </div>

        {canEdit && unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <CheckCheck className="w-4 h-4 text-blue-700" />
            <span>Marcar todas como leídas</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto max-w-full">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              catFilter === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No hay avisos en esta categoría.
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 transition-colors ${
                !n.read ? 'bg-blue-50/40' : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <Bell className={`w-4 h-4 mt-1 shrink-0 ${n.priority === 'Alta' ? 'text-red-600' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span>{n.category}</span>
                    <span>·</span>
                    <span className="font-mono">{n.createdAt}</span>
                    {!n.read && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-blue-700">Sin leer</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5 break-words">{n.title}</h3>
                  <p className="text-sm text-slate-600 mt-0.5 break-words">{n.message}</p>
                </div>
              </div>

              {!n.read && canEdit && (
                <button
                  onClick={() => onMarkRead(n.id)}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg shrink-0 whitespace-nowrap"
                >
                  Marcar leída
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
