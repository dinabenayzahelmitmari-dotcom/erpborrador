import { useEffect, useState } from 'react';
import { Check, Copy, Pause, Play, RefreshCw, Send } from 'lucide-react';
import type { Company, OutboxEvent, WorkflowRule } from '../types/erp';
import { StatusText } from './StatusText';

interface AutomationViewProps {
  company: Company;
  workflows: WorkflowRule[];
  outboxEvents: OutboxEvent[];
  canEdit: boolean;
  onToggleWorkflow: (id: string) => Promise<void>;
  onRunWorkflow: (id: string) => Promise<string>;
  onSaveWebhookConfig: (webhookUrl: string, secret: string) => Promise<void>;
  onTestWebhook: () => Promise<string>;
}

export function AutomationView({
  company,
  workflows,
  outboxEvents,
  canEdit,
  onToggleWorkflow,
  onRunWorkflow,
  onSaveWebhookConfig,
  onTestWebhook,
}: AutomationViewProps) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState(company.n8nWebhookUrl ?? '');
  const [secret, setSecret] = useState(company.n8nSecret ?? '');
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setWebhookUrl(company.n8nWebhookUrl ?? '');
    setSecret(company.n8nSecret ?? '');
  }, [company.id, company.n8nWebhookUrl, company.n8nSecret]);

  const inboundEndpoint = `${window.location.origin}/api/integrations/n8n/inbound`;

  const handleCopyInbound = () => {
    navigator.clipboard.writeText(inboundEndpoint);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await onSaveWebhookConfig(webhookUrl, secret);
      setLastFeedback('Configuración de n8n guardada. Los eventos del ERP se enviarán automáticamente a tu webhook.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTest = async () => {
    setTestingWebhook(true);
    try {
      const msg = await onTestWebhook();
      setLastFeedback(msg);
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleRun = async (id: string) => {
    setRunningId(id);
    try {
      const msg = await onRunWorkflow(id);
      setLastFeedback(msg);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Automatizaciones con n8n</h1>
        <p className="text-sm text-slate-600 mt-1">
          Conecta tu instancia externa de n8n con un clic para ahorrar trabajo repetitivo: recibir facturas por correo, reclamar cobros y generar cierres automáticos.
        </p>
      </div>

      {lastFeedback && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <span className="break-words">{lastFeedback}</span>
          <button onClick={() => setLastFeedback(null)} className="text-xs font-medium text-blue-700 hover:underline self-start sm:self-auto shrink-0">
            Ocultar
          </button>
        </div>
      )}

      {/* External n8n Connection Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Conexión con tu servidor n8n</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bidireccional: el ERP envía eventos a tu Webhook de n8n y n8n puede llamar a la API de entrada del ERP.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 sm:p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700">URL de entrada del ERP (para tus nodos HTTP Request en n8n)</p>
              <p className="text-xs font-mono text-slate-900 mt-0.5 break-all">{inboundEndpoint}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyInbound}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 shrink-0 w-fit"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copiada' : 'Copiar URL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 break-words leading-relaxed">
            ID de empresa para tus peticiones: <span className="font-mono font-semibold text-slate-700">{company.id}</span> · Acciones disponibles: <span className="font-mono break-all">ingest_supplier_invoice</span>, <span className="font-mono break-all">scan_overdue</span>, <span className="font-mono break-all">create_task</span>, <span className="font-mono break-all">monthly_closing_summary</span>.
          </p>
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Tu Webhook URL de n8n (para recibir eventos del ERP)
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://tu-n8n.ejemplo.com/webhook/erp-eventos"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Clave compartida (x-n8n-secret)
            </label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Opcional"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
          </div>
          <div className="md:col-span-3 flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-2.5 sm:py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {savingConfig ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  disabled={testingWebhook || !webhookUrl.trim()}
                  onClick={handleTest}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testingWebhook ? 'Probando...' : 'Probar'}</span>
                </button>
              </>
            )}
          </div>
        </form>
      </section>

      {/* Workflows list */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Flujos automatizados</h2>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {workflows.map((wf) => (
            <div key={wf.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="font-mono break-all">{wf.trigger}</span>
                  <span>·</span>
                  <StatusText status={wf.active ? wf.lastStatus : 'Inactivo'} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 break-words">{wf.name}</h3>
                <p className="text-sm text-slate-600 break-words">{wf.description}</p>
                <p className="text-xs text-slate-400 font-mono">
                  Última ejecución: {wf.lastRunAt} · Total ejecuciones: {wf.executionsCount}
                </p>
              </div>

              {canEdit && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleWorkflow(wf.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                  >
                    {wf.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{wf.active ? 'Pausar' : 'Activar'}</span>
                  </button>
                  <button
                    disabled={!wf.active || runningId === wf.id}
                    onClick={() => handleRun(wf.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-40 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${runningId === wf.id ? 'animate-spin' : ''}`} />
                    <span>{runningId === wf.id ? 'Ejecutando...' : 'Ejecutar ahora'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Transactional Outbox Events */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Registro de eventos (Transactional Outbox)</h2>
          <p className="text-xs text-slate-500">Eventos enviados hacia n8n y estado de respuesta</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="md:hidden divide-y divide-slate-100">
            {outboxEvents.map((ev) => (
              <div key={`mob-${ev.id}`} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-900 break-all">{ev.eventName}</span>
                  <StatusText status={ev.status} />
                </div>
                <p className="text-sm text-slate-700 break-words">{ev.entityRef}</p>
                {ev.deliveryDetail && (
                  <p className="text-xs text-slate-500 break-words">{ev.deliveryDetail}</p>
                )}
                <p className="text-[11px] font-mono text-slate-400">{ev.createdAt}</p>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Fecha y hora</th>
                  <th className="py-3 px-4">Evento</th>
                  <th className="py-3 px-4">Referencia</th>
                  <th className="py-3 px-4">Detalle</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {outboxEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">{ev.createdAt}</td>
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-900">{ev.eventName}</td>
                    <td className="py-2.5 px-4 text-slate-700">{ev.entityRef}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-500">{ev.deliveryDetail || '—'}</td>
                    <td className="py-2.5 px-4">
                      <StatusText status={ev.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
