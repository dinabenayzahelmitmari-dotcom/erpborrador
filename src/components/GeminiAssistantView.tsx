import { useState } from 'react';
import { Check, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { ChatMessage, ErpProposalAction, RoleId } from '../types/erp';
import { apiFetch, formatEUR } from '../lib/api';

interface GeminiAssistantViewProps {
  companyName: string;
  role: RoleId;
  roleName: string;
  onConfirmProposal: (proposal: ErpProposalAction) => Promise<void>;
}

const SUGGESTED_PROMPTS = [
  '¿Cuál es la facturación, gastos y saldo disponible este mes?',
  '¿Qué facturas están pendientes o vencidas actualmente?',
  'Resume nuestras tareas pendientes y aprobaciones por revisar.',
  'Prepara un borrador de presupuesto para Construcciones Levantinas por 3.200 € de revisión anual.',
];

export function GeminiAssistantView({
  companyName,
  role,
  roleName,
  onConfirmProposal,
}: GeminiAssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hola. Soy el asistente empresarial de ${companyName}. Trabajo conectado a las herramientas autorizadas para tu rol actual (${roleName}) y cualquier acción económica o creación de registros requerirá tu confirmación previa.`,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = nextMessages
        .filter((m) => m.id !== 'welcome')
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await apiFetch<{
        reply: string;
        toolsUsed: string[];
        proposal?: ErpProposalAction;
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        toolsUsed: res.toolsUsed,
        proposal: res.proposal,
        proposalStatus: res.proposal ? 'pending' : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `No se pudo completar la consulta: ${err instanceof Error ? err.message : 'Error de servidor.'}`,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleProposalAction = async (msgId: string, proposal: ErpProposalAction, accept: boolean) => {
    if (accept) {
      await onConfirmProposal(proposal);
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, proposalStatus: accept ? 'confirmed' : 'cancelled' } : m
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Asistente empresarial con Gemini</h1>
          <p className="text-sm text-slate-600 mt-1">
            Consultas sobre datos reales del ERP, preparación de borradores y análisis con verificación de permisos en backend.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Rol activo: <strong className="text-slate-900">{roleName}</strong> ({role})</span>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[calc(100dvh-230px)] min-h-[420px] overflow-hidden">
        {/* Suggested Prompts */}
        <div className="px-3 sm:px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-medium text-slate-500 shrink-0">Consultas rápidas:</span>
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(p)}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-blue-700 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-2xl rounded-xl px-3.5 sm:px-4 py-3 text-sm leading-relaxed break-words overflow-hidden ${
                  m.role === 'user'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.content}</div>

                {m.toolsUsed && m.toolsUsed.length > 0 && (
                  <p className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] font-mono text-slate-500 break-words">
                    Herramientas ERP consultadas: {m.toolsUsed.join(' · ')}
                  </p>
                )}

                {m.proposal && (
                  <div className="mt-3 p-3.5 bg-white border border-slate-200 rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-blue-700">Confirmación humana requerida</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{m.proposal.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{m.proposal.summary}</p>
                      </div>
                      {typeof m.proposal.amount === 'number' && (
                        <span className="text-sm font-mono font-bold text-slate-900 shrink-0">
                          {formatEUR(m.proposal.amount)}
                        </span>
                      )}
                    </div>

                    {m.proposalStatus === 'pending' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() => handleProposalAction(m.id, m.proposal!, true)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirmar y guardar en ERP</span>
                        </button>
                        <button
                          onClick={() => handleProposalAction(m.id, m.proposal!, false)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Descartar</span>
                        </button>
                      </div>
                    )}

                    {m.proposalStatus === 'confirmed' && (
                      <p className="text-xs font-medium text-emerald-700">
                        Acción confirmada y guardada en la base oficial del ERP.
                      </p>
                    )}

                    {m.proposalStatus === 'cancelled' && (
                      <p className="text-xs font-medium text-slate-500">
                        Propuesta descartada por el usuario.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Consultando herramientas autorizadas del ERP...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-3 sm:p-4 border-t border-slate-200 flex items-center gap-2 sm:gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Consulta clientes, facturas, gastos o pide un borrador..."
            className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
}
