import { useState } from 'react';
import { FileText, Folder, Plus, Search, X } from 'lucide-react';
import type { DocumentItem } from '../types/erp';
import { formatDateES } from '../lib/api';

interface DocumentsViewProps {
  documents: DocumentItem[];
  canCreate: boolean;
  onCreateDocument: (payload: {
    title: string;
    folder: DocumentItem['folder'];
    fileName: string;
    linkedEntity: string;
    summary: string;
  }) => Promise<void>;
}

export function DocumentsView({ documents, canCreate, onCreateDocument }: DocumentsViewProps) {
  const [folderFilter, setFolderFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(documents[0] ?? null);
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    title: '',
    folder: 'Contratos' as DocumentItem['folder'],
    fileName: '',
    linkedEntity: '',
    summary: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const folders = ['Todos', 'Facturas', 'Contratos', 'Certificados', 'Informes'];

  const filtered = documents.filter((d) => {
    const matchesFolder = folderFilter === 'Todos' || d.folder === folderFilter;
    const q = query.toLowerCase();
    const matchesQ =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.fileName.toLowerCase().includes(q) ||
      (d.linkedEntity ?? '').toLowerCase().includes(q);
    return matchesFolder && matchesQ;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateDocument(form);
      setShowCreate(false);
      setForm({ title: '', folder: 'Contratos', fileName: '', linkedEntity: '', summary: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestión documental</h1>
          <p className="text-sm text-slate-600 mt-1">
            Archivo organizado por carpetas, control de versiones, trazabilidad y vínculo con registros del ERP.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Archivar documento</span>
          </button>
        )}
      </div>

      {/* Folder Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit max-w-full overflow-x-auto">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setFolderFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                folderFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar documento o entidad..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>
      </div>

      {/* Split Layout: List + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 min-w-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No hay documentos en esta carpeta.
            </div>
          ) : (
            filtered.map((doc) => {
              const active = selectedDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left p-4 flex items-start justify-between gap-3 transition-colors ${
                    active ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className={`w-5 h-5 mt-0.5 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {doc.folder} · {doc.fileName} · {doc.version}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-500 shrink-0">{formatDateES(doc.updatedAt)}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 min-w-0">
          {selectedDoc ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <Folder className="w-4 h-4 text-blue-700 shrink-0" />
                <span>{selectedDoc.folder}</span>
                <span>·</span>
                <span className="font-mono">{selectedDoc.version}</span>
                <span>·</span>
                <span className="font-mono">{selectedDoc.sizeLabel}</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 break-words">{selectedDoc.title}</h2>
                <p className="text-xs font-mono text-slate-500 mt-1 break-all">{selectedDoc.fileName}</p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-4 break-words">
                {selectedDoc.summary}
              </p>
              <div className="text-xs text-slate-600 space-y-2 border-t border-slate-200 pt-4">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Entidad vinculada</span>
                  <span className="font-medium text-slate-900 text-right break-words">{selectedDoc.linkedEntity || 'General'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Subido por</span>
                  <span className="font-medium text-slate-900 text-right break-words">{selectedDoc.uploadedBy}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Última actualización</span>
                  <span className="font-mono text-slate-900 text-right">{formatDateES(selectedDoc.updatedAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Almacenamiento</span>
                  <span className="font-mono text-slate-900 text-right">S3 / MinIO cifrado</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              Selecciona un documento para ver su ficha y metadatos.
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900">Archivar nuevo documento</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-slate-400 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Título descriptivo *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej. Contrato de servicios logísticos 2027"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Carpeta</label>
                  <select
                    value={form.folder}
                    onChange={(e) => setForm({ ...form, folder: e.target.value as DocumentItem['folder'] })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Contratos">Contratos</option>
                    <option value="Facturas">Facturas</option>
                    <option value="Certificados">Certificados</option>
                    <option value="Informes">Informes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre de archivo *</label>
                  <input
                    required
                    value={form.fileName}
                    onChange={(e) => setForm({ ...form, fileName: e.target.value })}
                    placeholder="contrato-2027.pdf"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cliente, proveedor o área vinculada</label>
                <input
                  value={form.linkedEntity}
                  onChange={(e) => setForm({ ...form, linkedEntity: e.target.value })}
                  placeholder="Ej. Logística Península S.L."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Resumen del contenido</label>
                <textarea
                  rows={3}
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="Breve descripción para facilitar búsquedas futuras..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
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
                  {submitting ? 'Archivando...' : 'Guardar documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
