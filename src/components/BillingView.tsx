import { useState } from 'react';
import { Check, Eye, Plus, Search, Trash2, X } from 'lucide-react';
import type { Company, Customer, Invoice, InvoiceLine } from '../types/erp';
import { formatDateES, formatEUR } from '../lib/api';
import { InvoiceDocumentModal } from './InvoiceDocumentModal';
import { StatusText } from './StatusText';

interface BillingViewProps {
  company: Company;
  invoices: Invoice[];
  customers: Customer[];
  canCreate: boolean;
  canApprove: boolean;
  onCreateInvoice: (payload: {
    type: 'Factura' | 'Presupuesto' | 'Rectificativa';
    customerId: string;
    dueDate: string;
    lines: InvoiceLine[];
    notes?: string;
  }) => Promise<void>;
  onMarkPaid: (invoiceId: string) => Promise<void>;
}

export function BillingView({
  company,
  invoices,
  customers,
  canCreate,
  canApprove,
  onCreateInvoice,
  onMarkPaid,
}: BillingViewProps) {
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [query, setQuery] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [docType, setDocType] = useState<'Factura' | 'Presupuesto' | 'Rectificativa'>('Factura');
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [dueDate, setDueDate] = useState('2026-12-18');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unitPrice: 0, vatRate: 21 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const statuses = ['Todas', 'Pendiente', 'Cobrada', 'Vencida', 'Borrador'];

  const filtered = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'Todas' || inv.status === statusFilter;
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      inv.number.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const draftSubtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const draftVat = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const draftTotal = draftSubtotal + draftVat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCustomerId = customerId || customers[0]?.id;
    if (!targetCustomerId) return;
    setSubmitting(true);
    try {
      await onCreateInvoice({
        type: docType,
        customerId: targetCustomerId,
        dueDate,
        lines,
        notes: notes.trim() || undefined,
      });
      setShowCreate(false);
      setLines([{ description: '', quantity: 1, unitPrice: 0, vatRate: 21 }]);
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Facturación y documentos</h1>
          <p className="text-sm text-slate-600 mt-1">
            Emisión de facturas, presupuestos, control de cobros y generación documental PDF.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              if (!customerId && customers[0]) setCustomerId(customers[0].id);
              setShowCreate(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear documento</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit max-w-full overflow-x-auto">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por número o cliente..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-10 text-center text-sm text-slate-500">
            No se encontraron documentos con los filtros actuales.
          </div>
        ) : (
          filtered.map((inv) => (
            <div key={`mob-${inv.id}`} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-slate-500">
                    {inv.number} · {inv.type}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{inv.customerName}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                    Vence: {formatDateES(inv.dueDate)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-mono tabular-nums font-bold text-slate-900">{formatEUR(inv.total)}</p>
                  <div className="mt-1">
                    <StatusText status={inv.status} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setPreviewInvoice(inv)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver PDF</span>
                </button>
                {canCreate && (
                  <button
                    onClick={() =>
                      onCreateInvoice({
                        type: inv.type === 'Presupuesto' ? 'Factura' : inv.type,
                        customerId: inv.customerId,
                        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                        lines: inv.lines,
                        notes:
                          inv.type === 'Presupuesto'
                            ? `Convertido desde presupuesto ${inv.number}.`
                            : `Duplicado de ${inv.number}.`,
                      })
                    }
                    className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                  >
                    {inv.type === 'Presupuesto' ? 'Pasar a factura' : 'Duplicar'}
                  </button>
                )}
                {canApprove && inv.type === 'Factura' && (inv.status === 'Pendiente' || inv.status === 'Vencida') && (
                  <button
                    onClick={() => onMarkPaid(inv.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Cobrar</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Número</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Emisión / Vencimiento</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No se encontraron documentos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {inv.number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{inv.type}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{inv.customerName}</span>
                      <span className="block text-xs font-mono text-slate-400">{inv.customerNif}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {formatDateES(inv.issueDate)} · {formatDateES(inv.dueDate)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatEUR(inv.total)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                        {canCreate && (
                          <button
                            onClick={() =>
                              onCreateInvoice({
                                type: inv.type === 'Presupuesto' ? 'Factura' : inv.type,
                                customerId: inv.customerId,
                                dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                                lines: inv.lines,
                                notes:
                                  inv.type === 'Presupuesto'
                                    ? `Convertido desde presupuesto ${inv.number}.`
                                    : `Duplicado de ${inv.number}.`,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                          >
                            <span>{inv.type === 'Presupuesto' ? 'Pasar a factura' : 'Duplicar'}</span>
                          </button>
                        )}
                        {canApprove && inv.type === 'Factura' && (inv.status === 'Pendiente' || inv.status === 'Vencida') && (
                          <button
                            onClick={() => onMarkPaid(inv.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Cobrar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance note from PDF */}
      <p className="text-xs text-slate-500">
        Nota regulatoria: la generación de PDF corporativo se realiza desde plantillas validadas; la adaptación definitiva a requisitos VeriFactu depende del calendario normativo vigente.
      </p>

      {/* PDF / Document Modal */}
      {previewInvoice && (
        <InvoiceDocumentModal
          invoice={previewInvoice}
          company={company}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900">Emitir documento de facturación</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as 'Factura' | 'Presupuesto' | 'Rectificativa')}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Factura">Factura</option>
                    <option value="Presupuesto">Presupuesto</option>
                    <option value="Rectificativa">Rectificativa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cliente</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha vencimiento</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">Líneas de concepto</label>
                  <button
                    type="button"
                    onClick={() => setLines([...lines, { description: '', quantity: 1, unitPrice: 0, vatRate: 21 }])}
                    className="text-xs font-medium text-blue-700 hover:text-blue-800"
                  >
                    + Añadir línea
                  </button>
                </div>
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="p-3 sm:p-0 bg-slate-50 sm:bg-transparent border sm:border-0 border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <input
                      required
                      placeholder="Descripción del servicio o producto"
                      value={line.description}
                      onChange={(e) => {
                        const copy = [...lines];
                        copy[idx].description = e.target.value;
                        setLines(copy);
                      }}
                      className="sm:col-span-6 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                    />
                    <div className="grid grid-cols-3 sm:contents gap-2">
                      <input
                        type="number"
                        min={1}
                        required
                        aria-label="Cantidad"
                        placeholder="Cant."
                        value={line.quantity}
                        onChange={(e) => {
                          const copy = [...lines];
                          copy[idx].quantity = Number(e.target.value);
                          setLines(copy);
                        }}
                        className="sm:col-span-2 px-2 py-2 text-sm font-mono text-right bg-white border border-slate-200 rounded-lg"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        required
                        aria-label="Precio unitario"
                        placeholder="Precio €"
                        value={line.unitPrice || ''}
                        onChange={(e) => {
                          const copy = [...lines];
                          copy[idx].unitPrice = Number(e.target.value);
                          setLines(copy);
                        }}
                        className="sm:col-span-2 px-2 py-2 text-sm font-mono text-right bg-white border border-slate-200 rounded-lg"
                      />
                      <div className="flex items-center gap-1 sm:col-span-2">
                        <select
                          value={line.vatRate}
                          onChange={(e) => {
                            const copy = [...lines];
                            copy[idx].vatRate = Number(e.target.value);
                            setLines(copy);
                          }}
                          className="flex-1 px-2 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                        >
                          <option value={21}>21%</option>
                          <option value={10}>10%</option>
                          <option value={4}>4%</option>
                          <option value={0}>0%</option>
                        </select>
                        <button
                          type="button"
                          disabled={lines.length === 1}
                          onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                          className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30 shrink-0"
                          aria-label="Eliminar línea"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Observaciones</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condiciones de pago o referencia de pedido"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-xs text-slate-500 block">Base imponible</span>
                    <span className="font-mono tabular-nums font-semibold">{formatEUR(draftSubtotal)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">IVA</span>
                    <span className="font-mono tabular-nums font-semibold">{formatEUR(draftVat)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total documento</span>
                  <span className="text-lg font-mono tabular-nums font-bold text-slate-900">
                    {formatEUR(draftTotal)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {submitting ? 'Emitiendo...' : 'Guardar documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
