import { useState } from 'react';
import { Plus, Search, Sparkles, Upload, X } from 'lucide-react';
import type { Expense } from '../types/erp';
import { apiFetch, formatDateES, formatEUR } from '../lib/api';
import { StatusText } from './StatusText';

interface ExpensesViewProps {
  expenses: Expense[];
  canCreate: boolean;
  onCreateExpense: (payload: {
    supplierName: string;
    supplierNif: string;
    concept: string;
    category: Expense['category'];
    costCenter: string;
    date: string;
    subtotal: number;
    vatAmount: number;
    source: 'Manual' | 'Extracción Gemini';
  }) => Promise<void>;
}

const SAMPLE_RECEIPT_TEXT = `FACTURA Nº F-2026-8841
Emisor: Iberdrola Clientes S.A.U. · NIF: A95758389
Fecha: 2026-11-17
Concepto: Suministro eléctrico oficinas centrales noviembre 2026
Base imponible: 620,00 EUR
IVA (21%): 130,20 EUR
Total a pagar: 750,20 EUR`;

export function ExpensesView({ expenses, canCreate, onCreateExpense }: ExpensesViewProps) {
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showExtract, setShowExtract] = useState(false);

  const [rawText, setRawText] = useState('');
  const [fileInfo, setFileInfo] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [form, setForm] = useState({
    supplierName: '',
    supplierNif: '',
    concept: '',
    category: 'Servicios profesionales' as Expense['category'],
    costCenter: 'Administración',
    date: new Date().toISOString().slice(0, 10),
    subtotal: 0,
    vatAmount: 0,
    source: 'Manual' as 'Manual' | 'Extracción Gemini',
  });
  const [submitting, setSubmitting] = useState(false);

  const categories = ['Todas', 'Suministros', 'Software', 'Servicios profesionales', 'Viajes', 'Material', 'Otros'];

  const filtered = expenses.filter((e) => {
    const matchesCat = categoryFilter === 'Todas' || e.category === categoryFilter;
    const q = query.toLowerCase();
    const matchesQ =
      !q ||
      e.supplierName.toLowerCase().includes(q) ||
      e.concept.toLowerCase().includes(q) ||
      e.costCenter.toLowerCase().includes(q);
    return matchesCat && matchesQ;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setFileInfo({
        name: file.name,
        base64,
        mimeType: file.type || 'image/png',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleExtractWithGemini = async () => {
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await apiFetch<{
        extracted: {
          supplierName: string;
          supplierNif: string;
          concept: string;
          category: Expense['category'];
          date: string;
          subtotal: number;
          vatAmount: number;
          total: number;
        };
      }>('/api/ai/extract', {
        method: 'POST',
        body: JSON.stringify({
          rawText: rawText.trim() || undefined,
          fileBase64: fileInfo?.base64,
          mimeType: fileInfo?.mimeType,
        }),
      });

      setForm({
        supplierName: res.extracted.supplierName,
        supplierNif: res.extracted.supplierNif,
        concept: res.extracted.concept,
        category: res.extracted.category,
        costCenter: 'Administración',
        date: res.extracted.date,
        subtotal: res.extracted.subtotal,
        vatAmount: res.extracted.vatAmount,
        source: 'Extracción Gemini',
      });
      setShowExtract(false);
      setShowCreate(true);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Error al extraer datos del documento.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateExpense(form);
      setShowCreate(false);
      setForm({
        supplierName: '',
        supplierNif: '',
        concept: '',
        category: 'Servicios profesionales',
        costCenter: 'Administración',
        date: new Date().toISOString().slice(0, 10),
        subtotal: 0,
        vatAmount: 0,
        source: 'Manual',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gastos y compras</h1>
          <p className="text-sm text-slate-600 mt-1">
            Control de tickets, facturas recibidas, centros de coste y extracción asistida por Gemini.
          </p>
        </div>

        {canCreate && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowExtract(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>Extraer con Gemini</span>
            </button>
            <button
              onClick={() => {
                setForm({ ...form, source: 'Manual' });
                setShowCreate(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo gasto</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proveedor o concepto..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-10 text-center text-sm text-slate-500">
            No hay gastos registrados en esta categoría.
          </div>
        ) : (
          filtered.map((exp) => (
            <div key={`mob-${exp.id}`} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{exp.supplierName}</p>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{exp.concept}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDateES(exp.date)} · {exp.category}
                </p>
                <div className="mt-2">
                  <StatusText status={exp.status} />
                </div>
              </div>
              <span className="text-sm font-mono tabular-nums font-bold text-slate-900 shrink-0">
                {formatEUR(exp.total)}
              </span>
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
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Proveedor y concepto</th>
                <th className="py-3 px-4">Categoría / Centro</th>
                <th className="py-3 px-4">Origen</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No hay gastos registrados en esta categoría.
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {formatDateES(exp.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{exp.supplierName}</span>
                      <span className="block text-xs text-slate-500">{exp.concept}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <span className="text-slate-800 font-medium">{exp.category}</span>
                      <span className="block text-slate-400">{exp.costCenter}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{exp.source}</td>
                    <td className="py-3 px-4">
                      <StatusText status={exp.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatEUR(exp.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extract with Gemini Modal */}
      {showExtract && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Extraer factura o ticket con Gemini</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gemini propone un borrador estructurado; tú revisas y confirmas antes de guardar.
                </p>
              </div>
              <button onClick={() => setShowExtract(false)} className="p-1.5 text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            {extractError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {extractError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">Texto de la factura o ticket</label>
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_RECEIPT_TEXT)}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Usar ejemplo
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Pega aquí el texto del correo, factura o recibo..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  O adjunta imagen / PDF de factura
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-xs text-slate-600">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>{fileInfo ? `Archivo cargado: ${fileInfo.name}` : 'Seleccionar imagen (PNG/JPG) o PDF'}</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowExtract(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={extracting || (!rawText.trim() && !fileInfo)}
                onClick={handleExtractWithGemini}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{extracting ? 'Extrayendo...' : 'Extraer borrador'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Confirm Expense Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {form.source === 'Extracción Gemini' ? 'Revisar y confirmar gasto extraído' : 'Registrar nuevo gasto'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los gastos de 500 € o más pasan automáticamente al circuito de Aprobaciones.
                </p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Proveedor *</label>
                  <input
                    required
                    value={form.supplierName}
                    onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">NIF proveedor</label>
                  <input
                    value={form.supplierNif}
                    onChange={(e) => setForm({ ...form, supplierNif: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Concepto *</label>
                  <input
                    required
                    value={form.concept}
                    onChange={(e) => setForm({ ...form, concept: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as Expense['category'] })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {categories.filter((c) => c !== 'Todas').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Centro de coste</label>
                  <input
                    value={form.costCenter}
                    onChange={(e) => setForm({ ...form, costCenter: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Base imponible (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.subtotal || ''}
                    onChange={(e) => {
                      const base = Number(e.target.value);
                      setForm({ ...form, subtotal: base, vatAmount: Math.round(base * 0.21 * 100) / 100 });
                    }}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">IVA (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.vatAmount || ''}
                    onChange={(e) => setForm({ ...form, vatAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center text-sm">
                <span className="text-slate-600">Total gasto</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatEUR(form.subtotal + form.vatAmount)}
                </span>
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
                  {submitting ? 'Guardando...' : 'Confirmar y guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
