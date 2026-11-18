import { Download, Printer, X } from 'lucide-react';
import type { Company, Invoice } from '../types/erp';
import { formatDateES, formatEUR } from '../lib/api';

interface InvoiceDocumentModalProps {
  invoice: Invoice;
  company: Company;
  onClose: () => void;
}

export function InvoiceDocumentModal({ invoice, company, onClose }: InvoiceDocumentModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${invoice.type} ${invoice.number}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; margin: 40px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
  .title { font-size: 24px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
  th { background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #475569; }
  .right { text-align: right; }
  .totals { width: 280px; margin-left: auto; }
  .totals td { border: none; padding: 6px 8px; }
  .grand { font-weight: bold; font-size: 16px; border-top: 2px solid #0f172a !important; }
  .footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${company.name}</div>
      <div>NIF: ${company.nif}</div>
      <div>${company.address} · ${company.city}</div>
      <div>${company.email} · ${company.phone}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:bold">${invoice.type.toUpperCase()}</div>
      <div><strong>Nº:</strong> ${invoice.number}</div>
      <div><strong>Emisión:</strong> ${formatDateES(invoice.issueDate)}</div>
      <div><strong>Vencimiento:</strong> ${formatDateES(invoice.dueDate)}</div>
    </div>
  </div>
  <div>
    <strong>Cliente:</strong> ${invoice.customerName}<br/>
    <strong>NIF:</strong> ${invoice.customerNif}
  </div>
  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th class="right">Cantidad</th>
        <th class="right">Precio unitario</th>
        <th class="right">IVA</th>
        <th class="right">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lines
        .map(
          (l) => `<tr>
            <td>${l.description}</td>
            <td class="right">${l.quantity}</td>
            <td class="right">${formatEUR(l.unitPrice)}</td>
            <td class="right">${l.vatRate}%</td>
            <td class="right">${formatEUR(l.quantity * l.unitPrice)}</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <table class="totals">
    <tr><td>Base imponible</td><td class="right">${formatEUR(invoice.subtotal)}</td></tr>
    <tr><td>IVA</td><td class="right">${formatEUR(invoice.vatAmount)}</td></tr>
    <tr class="grand"><td>Total documento</td><td class="right">${formatEUR(invoice.total)}</td></tr>
  </table>
  <div class="footer">
    IBAN para transferencias: ${company.iban}. Documento generado desde plantilla validada de Núcleo ERP.
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[92dvh] overflow-y-auto shadow-xl">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate">
              Vista previa documental · {invoice.number}
            </h3>
            <p className="text-xs text-slate-500">
              Plantilla corporativa lista para imprimir o guardar como PDF
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar vista previa"
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8 bg-white text-slate-900 space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-6 border-b border-slate-900 pb-6">
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">{company.name}</p>
              <p className="text-xs text-slate-600 mt-1">NIF: {company.nif}</p>
              <p className="text-xs text-slate-600">{company.address}</p>
              <p className="text-xs text-slate-600">{company.city}</p>
              <p className="text-xs text-slate-500 mt-1">
                {company.email} · {company.phone}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xl font-bold text-blue-700 uppercase tracking-wide">{invoice.type}</p>
              <p className="text-sm font-mono font-semibold text-slate-900 mt-1">{invoice.number}</p>
              <p className="text-xs text-slate-600 mt-2">
                Fecha emisión: <span className="font-mono tabular-nums">{formatDateES(invoice.issueDate)}</span>
              </p>
              <p className="text-xs text-slate-600">
                Vencimiento: <span className="font-mono tabular-nums">{formatDateES(invoice.dueDate)}</span>
              </p>
              <p className="text-xs text-slate-600 mt-1">Estado: {invoice.status}</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-500">Datos del cliente</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">{invoice.customerName}</p>
            <p className="text-xs text-slate-600 font-mono mt-0.5">NIF/CIF: {invoice.customerNif}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 text-left font-medium">Concepto</th>
                  <th className="py-2.5 text-right font-medium">Cant.</th>
                  <th className="py-2.5 text-right font-medium">Precio unit.</th>
                  <th className="py-2.5 text-right font-medium">IVA</th>
                  <th className="py-2.5 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-3 text-slate-800">{line.description}</td>
                    <td className="py-3 text-right font-mono tabular-nums text-slate-700">{line.quantity}</td>
                    <td className="py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatEUR(line.unitPrice)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-slate-700">{line.vatRate}%</td>
                    <td className="py-3 text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatEUR(line.quantity * line.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="text-xs text-slate-500 max-w-sm space-y-1">
              <p className="font-medium text-slate-700">Forma de pago e información fiscal</p>
              <p>Transferencia bancaria IBAN: <span className="font-mono text-slate-700">{company.iban}</span></p>
              {invoice.notes && <p className="text-slate-600">{invoice.notes}</p>}
            </div>

            <div className="w-full sm:w-64 space-y-2 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Base imponible</span>
                <span className="font-mono tabular-nums">{formatEUR(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cuota IVA</span>
                <span className="font-mono tabular-nums">{formatEUR(invoice.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-900 pt-2">
                <span>Total</span>
                <span className="font-mono tabular-nums">{formatEUR(invoice.total)}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 border-t border-slate-200 pt-4">
            Documento emitido desde plantilla corporativa versionada · Preparado para requisitos de trazabilidad documental (VeriFactu).
          </p>
        </div>
      </div>
    </div>
  );
}
