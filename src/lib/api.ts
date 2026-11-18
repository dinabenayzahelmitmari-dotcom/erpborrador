import type { RoleId } from '../types/erp';

let activeCompanyId = 'emp-iberica';
let activeRole: RoleId = 'direccion';

export function setApiContext(companyId: string, role: RoleId) {
  activeCompanyId = companyId;
  activeRole = role;
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('x-company-id', activeCompanyId);
  headers.set('x-user-role', activeRole);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMessage =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Error HTTP ${res.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateES(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
