import { AlertCircle, CheckCircle2, Clock, FileEdit, XCircle } from 'lucide-react';

interface StatusTextProps {
  status: string;
}

export function StatusText({ status }: StatusTextProps) {
  const normalized = status.toLowerCase();

  if (
    normalized === 'cobrada' ||
    normalized === 'aprobado' ||
    normalized === 'aprobada' ||
    normalized === 'activo' ||
    normalized === 'homologado' ||
    normalized === 'correcto' ||
    normalized === 'verificada' ||
    normalized === 'enviado a n8n'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  if (
    normalized === 'vencida' ||
    normalized === 'rechazado' ||
    normalized === 'rechazada' ||
    normalized === 'bloqueado' ||
    normalized === 'error'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  if (normalized === 'borrador' || normalized === 'inactivo') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
        <FileEdit className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  if (normalized === 'en revisión' || normalized === 'procesando') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      <span>{status}</span>
    </span>
  );
}
