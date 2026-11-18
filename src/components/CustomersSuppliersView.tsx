import { useState } from 'react';
import { Building2, Mail, MapPin, Phone, Plus, Search, User, X } from 'lucide-react';
import type { Customer, Supplier } from '../types/erp';
import { formatEUR } from '../lib/api';
import { StatusText } from './StatusText';

interface DirectoryViewProps {
  mode: 'clientes' | 'proveedores';
  customers: Customer[];
  suppliers: Supplier[];
  canCreate: boolean;
  onCreateCustomer: (payload: {
    name: string;
    nif: string;
    email: string;
    phone: string;
    city: string;
    contactPerson: string;
  }) => Promise<void>;
  onCreateSupplier: (payload: {
    name: string;
    nif: string;
    category: string;
    email: string;
    phone: string;
    contactPerson: string;
  }) => Promise<void>;
}

export function CustomersSuppliersView({
  mode,
  customers,
  suppliers,
  canCreate,
  onCreateCustomer,
  onCreateSupplier,
}: DirectoryViewProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const [form, setForm] = useState({
    name: '',
    nif: '',
    email: '',
    phone: '',
    city: '',
    category: 'Servicios profesionales',
    contactPerson: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isCustomers = mode === 'clientes';
  const statusOptions = isCustomers
    ? ['Todos', 'Activo', 'En revisión', 'Inactivo']
    : ['Todos', 'Homologado', 'Pendiente', 'Bloqueado'];

  const filteredCustomers = customers.filter((c) => {
    const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.nif.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesStatus = statusFilter === 'Todos' || s.status === statusFilter;
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.nif.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isCustomers) {
        await onCreateCustomer({
          name: form.name,
          nif: form.nif,
          email: form.email,
          phone: form.phone,
          city: form.city,
          contactPerson: form.contactPerson,
        });
      } else {
        await onCreateSupplier({
          name: form.name,
          nif: form.nif,
          category: form.category,
          email: form.email,
          phone: form.phone,
          contactPerson: form.contactPerson,
        });
      }
      setForm({
        name: '',
        nif: '',
        email: '',
        phone: '',
        city: '',
        category: 'Servicios profesionales',
        contactPerson: '',
      });
      setShowCreate(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isCustomers ? 'Clientes' : 'Proveedores'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {isCustomers
              ? 'Ficha fiscal, contactos comerciales y volumen facturado por cliente.'
              : 'Datos fiscales, homologación, categorías y volumen de compras.'}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isCustomers ? 'Nuevo cliente' : 'Nuevo proveedor'}</span>
          </button>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit max-w-full overflow-x-auto">
          {statusOptions.map((st) => (
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
            placeholder={isCustomers ? 'Buscar por nombre, NIF o ciudad...' : 'Buscar por nombre, NIF o categoría...'}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isCustomers ? (
          filteredCustomers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl py-10 text-center text-sm text-slate-500">
              No hay clientes que coincidan con el filtro seleccionado.
            </div>
          ) : (
            filteredCustomers.map((c) => (
              <button
                key={`mob-${c.id}`}
                onClick={() => setSelectedCustomer(c)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {c.nif} {c.city ? `· ${c.city}` : ''}
                  </p>
                  <div className="mt-2">
                    <StatusText status={c.status} />
                  </div>
                </div>
                <span className="text-sm font-mono tabular-nums font-bold text-slate-900 shrink-0">
                  {formatEUR(c.totalBilled)}
                </span>
              </button>
            ))
          )
        ) : filteredSuppliers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-10 text-center text-sm text-slate-500">
            No hay proveedores que coincidan con el filtro seleccionado.
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <button
              key={`mob-${s.id}`}
              onClick={() => setSelectedSupplier(s)}
              className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  {s.nif} · {s.category}
                </p>
                <div className="mt-2">
                  <StatusText status={s.status} />
                </div>
              </div>
              <span className="text-sm font-mono tabular-nums font-bold text-slate-900 shrink-0">
                {formatEUR(s.totalPurchased)}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Desktop Data Grid */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Razón social</th>
                <th className="py-3 px-4">NIF / CIF</th>
                <th className="py-3 px-4">{isCustomers ? 'Localidad' : 'Categoría'}</th>
                <th className="py-3 px-4">Contacto principal</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">{isCustomers ? 'Total facturado' : 'Volumen compras'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isCustomers ? (
                filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No hay clientes que coincidan con el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{c.nif}</td>
                      <td className="py-3 px-4 text-slate-600">{c.city || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.contactPerson || '—'}
                        {c.email && <span className="block text-xs text-slate-400">{c.email}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={c.status} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatEUR(c.totalBilled)}
                      </td>
                    </tr>
                  ))
                )
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No hay proveedores que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSupplier(s)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{s.nif}</td>
                    <td className="py-3 px-4 text-slate-600">{s.category}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.contactPerson || '—'}
                      {s.email && <span className="block text-xs text-slate-400">{s.email}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={s.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatEUR(s.totalPurchased)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Slide-over Drawer */}
      {(selectedCustomer || selectedSupplier) && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 flex justify-end">
          <div className="bg-white w-full max-w-md h-full border-l border-slate-200 p-6 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs text-slate-500">{isCustomers ? 'Ficha de cliente' : 'Ficha de proveedor'}</p>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                    {selectedCustomer?.name ?? selectedSupplier?.name}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSelectedSupplier(null);
                  }}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3 text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>NIF/CIF: <strong className="font-mono">{selectedCustomer?.nif ?? selectedSupplier?.nif}</strong></span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Contacto: {selectedCustomer?.contactPerson || selectedSupplier?.contactPerson || 'No especificado'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="break-all">{selectedCustomer?.email || selectedSupplier?.email || 'Sin correo'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono">{selectedCustomer?.phone || selectedSupplier?.phone || 'Sin teléfono'}</span>
                </div>
                {selectedCustomer && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{selectedCustomer.city || 'No indicada'}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-xs text-slate-500">Resumen económico acumulado</p>
                <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {formatEUR(selectedCustomer ? selectedCustomer.totalBilled : selectedSupplier?.totalPurchased ?? 0)}
                </p>
                <div className="pt-1">
                  <StatusText status={selectedCustomer?.status ?? selectedSupplier?.status ?? ''} />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedCustomer(null);
                setSelectedSupplier(null);
              }}
              className="w-full py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cerrar ficha
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {isCustomers ? 'Registrar nuevo cliente' : 'Registrar nuevo proveedor'}
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Razón social *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Industrias Mediterráneas S.L."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">NIF / CIF *</label>
                  <input
                    required
                    value={form.nif}
                    onChange={(e) => setForm({ ...form, nif: e.target.value })}
                    placeholder="B12345678"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                  />
                </div>
                <div>
                  {isCustomers ? (
                    <>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Ciudad</label>
                      <input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="Madrid"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Categoría</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                      >
                        <option value="Suministros">Suministros</option>
                        <option value="Software">Software</option>
                        <option value="Servicios profesionales">Servicios profesionales</option>
                        <option value="Material">Material</option>
                      </select>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Persona de contacto</label>
                  <input
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="Nombre y apellidos"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+34 910 000 000"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="administracion@empresa.es"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
                  {submitting ? 'Guardando...' : 'Guardar ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
