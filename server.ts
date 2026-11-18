import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type { ModuleId, PermissionAction, RoleId } from './src/types/erp.ts';
import {
  addNotification,
  emitOutboxEvent,
  getDb,
  nowTimestamp,
  recordAudit,
  saveDb,
  todayDate,
} from './server/db.ts';
import {
  extractExpenseWithGemini,
  generateExecutiveBriefing,
  runErpAssistantChat,
} from './server/gemini.ts';
import { getRolePermissions, hasPermission, ROLES } from './server/permissions.ts';

const PORT = Number(process.env.PORT) || 3000;

function getContext(req: Request): { companyId: string; role: RoleId; actor: string } {
  const db = getDb();
  const requestedCompany = (req.headers['x-company-id'] as string) || (req.query.companyId as string) || 'emp-iberica';
  const validCompany = db.companies.find((c) => c.id === requestedCompany)?.id ?? db.companies[0].id;

  const requestedRole = ((req.headers['x-user-role'] as string) || 'direccion') as RoleId;
  const validRole: RoleId = ROLES[requestedRole] ? requestedRole : 'direccion';

  const actorMap: Record<RoleId, string> = {
    direccion: 'Elena Navarro (Dirección)',
    administracion: 'Marta Serrano (Administración)',
    contabilidad: 'Carlos Ruiz (Contabilidad)',
    comercial: 'David Gómez (Comercial)',
    auditor: 'Laura Méndez (Auditoría)',
  };

  return {
    companyId: validCompany,
    role: validRole,
    actor: actorMap[validRole],
  };
}

function requirePerm(
  res: Response,
  role: RoleId,
  module: ModuleId,
  action: PermissionAction
): boolean {
  if (!hasPermission(role, module, action)) {
    res.status(403).json({
      error: `Acceso denegado en servidor: el rol "${ROLES[role].name}" no tiene permiso "${action}" en el módulo "${module}".`,
    });
    return false;
  }
  return true;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Bootstrap endpoint: company data, permissions, KPIs, and counts
  app.get('/api/bootstrap', (req, res) => {
    const db = getDb();
    const { companyId, role, actor } = getContext(req);
    const company = db.companies.find((c) => c.id === companyId)!;
    const permissions = getRolePermissions(role);

    const invoices = db.invoices.filter((i) => i.companyId === companyId && i.type === 'Factura');
    const expenses = db.expenses.filter((e) => e.companyId === companyId);

    const billedTotal = invoices.reduce((s, i) => s + i.total, 0);
    const collectedTotal = invoices.filter((i) => i.status === 'Cobrada').reduce((s, i) => s + i.total, 0);
    const pendingReceivable = invoices
      .filter((i) => i.status === 'Pendiente' || i.status === 'Vencida')
      .reduce((s, i) => s + i.total, 0);
    const overdueCount = invoices.filter((i) => i.status === 'Vencida').length;

    const expensesTotal = expenses.filter((e) => e.status !== 'Rechazado').reduce((s, e) => s + e.total, 0);
    const pendingApprovals = db.approvals.filter((a) => a.companyId === companyId && a.status === 'Pendiente').length;
    const unreadNotifications = db.notifications.filter((n) => n.companyId === companyId && !n.read).length;
    const pendingTasks = db.tasks.filter((t) => t.companyId === companyId && !t.completed).length;

    res.json({
      company,
      companies: db.companies.map((c) => ({ id: c.id, name: c.name, nif: c.nif, plan: c.plan })),
      role,
      roleInfo: ROLES[role],
      roles: Object.values(ROLES).map((r) => ({ id: r.id, name: r.name, description: r.description })),
      actor,
      permissions,
      kpis: {
        billedTotal,
        collectedTotal,
        pendingReceivable,
        overdueCount,
        expensesTotal,
        estimatedProfit: billedTotal - expensesTotal,
        bankBalance: company.bankBalance,
        activeCustomers: db.customers.filter((c) => c.companyId === companyId && c.status === 'Activo').length,
        activeSuppliers: db.suppliers.filter((s) => s.companyId === companyId && s.status === 'Homologado').length,
        pendingApprovals,
        unreadNotifications,
        pendingTasks,
      },
    });
  });

  // Global Search across active company
  app.get('/api/search', (req, res) => {
    const { companyId, role } = getContext(req);
    const q = String(req.query.q ?? '').trim().toLowerCase();
    if (!q) {
      return res.json({ results: [] });
    }
    const db = getDb();
    const results: Array<{ id: string; module: ModuleId; category: string; title: string; subtitle: string }> = [];

    if (hasPermission(role, 'clientes', 'ver')) {
      for (const c of db.customers.filter((x) => x.companyId === companyId)) {
        if (c.name.toLowerCase().includes(q) || c.nif.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)) {
          results.push({ id: c.id, module: 'clientes', category: 'Cliente', title: c.name, subtitle: `${c.nif} · ${c.city}` });
        }
      }
    }
    if (hasPermission(role, 'proveedores', 'ver')) {
      for (const s of db.suppliers.filter((x) => x.companyId === companyId)) {
        if (s.name.toLowerCase().includes(q) || s.nif.toLowerCase().includes(q)) {
          results.push({ id: s.id, module: 'proveedores', category: 'Proveedor', title: s.name, subtitle: `${s.nif} · ${s.category}` });
        }
      }
    }
    if (hasPermission(role, 'facturacion', 'ver')) {
      for (const inv of db.invoices.filter((x) => x.companyId === companyId)) {
        if (inv.number.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q)) {
          results.push({
            id: inv.id,
            module: 'facturacion',
            category: inv.type,
            title: `${inv.number} · ${inv.customerName}`,
            subtitle: `${inv.total.toFixed(2)} € · ${inv.status}`,
          });
        }
      }
    }
    if (hasPermission(role, 'documentos', 'ver')) {
      for (const d of db.documents.filter((x) => x.companyId === companyId)) {
        if (d.title.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q)) {
          results.push({ id: d.id, module: 'documentos', category: 'Documento', title: d.title, subtitle: `${d.folder} · ${d.version}` });
        }
      }
    }
    if (hasPermission(role, 'agenda', 'ver')) {
      for (const t of db.tasks.filter((x) => x.companyId === companyId)) {
        if (t.title.toLowerCase().includes(q)) {
          results.push({ id: t.id, module: 'agenda', category: 'Tarea', title: t.title, subtitle: `Vence ${t.dueDate}` });
        }
      }
    }

    res.json({ results: results.slice(0, 12) });
  });

  // Customers
  app.get('/api/customers', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'clientes', 'ver')) return;
    const db = getDb();
    res.json({ items: db.customers.filter((c) => c.companyId === companyId) });
  });

  app.post('/api/customers', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'clientes', 'crear')) return;
    const { name, nif, email, phone, city, contactPerson } = req.body;
    if (!name || !nif) {
      return res.status(400).json({ error: 'Nombre fiscal y NIF/CIF son obligatorios.' });
    }
    const db = getDb();
    const item = {
      id: `cli-${Date.now()}`,
      companyId,
      name: String(name).trim(),
      nif: String(nif).trim().toUpperCase(),
      email: String(email ?? '').trim(),
      phone: String(phone ?? '').trim(),
      city: String(city ?? '').trim(),
      contactPerson: String(contactPerson ?? '').trim(),
      status: 'Activo' as const,
      totalBilled: 0,
      createdAt: todayDate(),
    };
    db.customers.unshift(item);
    recordAudit(companyId, actor, role, 'Alta de cliente', 'clientes', item.name);
    addNotification(companyId, 'Administración', `Nuevo cliente: ${item.name}`, `Registrado NIF ${item.nif}.`);
    emitOutboxEvent(companyId, 'customer.created', item.id);
    saveDb();
    res.status(201).json({ item });
  });

  // Suppliers
  app.get('/api/suppliers', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'proveedores', 'ver')) return;
    const db = getDb();
    res.json({ items: db.suppliers.filter((s) => s.companyId === companyId) });
  });

  app.post('/api/suppliers', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'proveedores', 'crear')) return;
    const { name, nif, category, email, phone, contactPerson } = req.body;
    if (!name || !nif) {
      return res.status(400).json({ error: 'Razón social y NIF son obligatorios.' });
    }
    const db = getDb();
    const item = {
      id: `prov-${Date.now()}`,
      companyId,
      name: String(name).trim(),
      nif: String(nif).trim().toUpperCase(),
      category: String(category ?? 'General').trim(),
      email: String(email ?? '').trim(),
      phone: String(phone ?? '').trim(),
      contactPerson: String(contactPerson ?? '').trim(),
      status: 'Homologado' as const,
      totalPurchased: 0,
      createdAt: todayDate(),
    };
    db.suppliers.unshift(item);
    recordAudit(companyId, actor, role, 'Alta de proveedor', 'proveedores', item.name);
    saveDb();
    res.status(201).json({ item });
  });

  // Invoices
  app.get('/api/invoices', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'facturacion', 'ver')) return;
    const db = getDb();
    res.json({ items: db.invoices.filter((i) => i.companyId === companyId) });
  });

  app.post('/api/invoices', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'facturacion', 'crear')) return;
    const { type, customerId, customerName, customerNif, dueDate, lines, notes, status } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos una línea de concepto.' });
    }
    const db = getDb();
    const cleanLines = lines.map((l: { description: string; quantity: number; unitPrice: number; vatRate: number }) => ({
      description: String(l.description || 'Servicio profesional'),
      quantity: Math.max(1, Number(l.quantity || 1)),
      unitPrice: Number(l.unitPrice || 0),
      vatRate: Number(l.vatRate ?? 21),
    }));

    const subtotal = Math.round(cleanLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100;
    const vatAmount =
      Math.round(cleanLines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;

    const existingCount = db.invoices.filter((i) => i.companyId === companyId).length + 140;
    const prefix = type === 'Presupuesto' ? 'PRE' : type === 'Rectificativa' ? 'REC' : 'FAC';
    const docNum = `${prefix}-2026-0${existingCount}`;

    const matchedCust = db.customers.find((c) => c.id === customerId && c.companyId === companyId);

    const item = {
      id: `fac-${Date.now()}`,
      companyId,
      number: docNum,
      type: (type === 'Presupuesto' || type === 'Rectificativa' ? type : 'Factura') as 'Factura' | 'Presupuesto' | 'Rectificativa',
      customerId: matchedCust?.id ?? String(customerId ?? ''),
      customerName: matchedCust?.name ?? String(customerName ?? 'Cliente'),
      customerNif: matchedCust?.nif ?? String(customerNif ?? ''),
      issueDate: todayDate(),
      dueDate: String(dueDate || todayDate()),
      status: (status === 'Borrador' ? 'Borrador' : 'Pendiente') as 'Borrador' | 'Pendiente',
      lines: cleanLines,
      subtotal,
      vatAmount,
      total,
      notes: notes ? String(notes) : undefined,
    };

    db.invoices.unshift(item);
    if (matchedCust && item.type === 'Factura') {
      matchedCust.totalBilled = Math.round((matchedCust.totalBilled + total) * 100) / 100;
    }

    recordAudit(companyId, actor, role, `Creación de ${item.type}`, 'facturacion', `${item.number} (${total.toFixed(2)} €)`);
    emitOutboxEvent(companyId, 'invoice.created', item.number);
    saveDb();
    res.status(201).json({ item });
  });

  app.post('/api/invoices/:id/mark-paid', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'facturacion', 'aprobar')) return;
    const db = getDb();
    const inv = db.invoices.find((i) => i.id === req.params.id && i.companyId === companyId);
    if (!inv) return res.status(404).json({ error: 'Factura no encontrada.' });
    if (inv.status === 'Cobrada') return res.json({ item: inv });

    inv.status = 'Cobrada';
    const company = db.companies.find((c) => c.id === companyId);
    if (company && inv.type === 'Factura') {
      company.bankBalance = Math.round((company.bankBalance + inv.total) * 100) / 100;
    }
    recordAudit(companyId, actor, role, 'Registro de cobro', 'facturacion', `${inv.number} (${inv.total.toFixed(2)} €)`);
    addNotification(companyId, 'Finanzas', `Cobro registrado: ${inv.number}`, `Ingresados ${inv.total.toFixed(2)} € de ${inv.customerName}.`);
    emitOutboxEvent(companyId, 'payment.received', inv.number);
    saveDb();
    res.json({ item: inv });
  });

  // Expenses
  app.get('/api/expenses', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'gastos', 'ver')) return;
    const db = getDb();
    res.json({ items: db.expenses.filter((e) => e.companyId === companyId) });
  });

  app.post('/api/expenses', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'gastos', 'crear')) return;
    const { supplierName, supplierNif, concept, category, costCenter, date, subtotal, vatAmount, source } = req.body;
    if (!supplierName || !concept) {
      return res.status(400).json({ error: 'Proveedor y concepto son obligatorios.' });
    }
    const base = Number(subtotal ?? 0);
    const vat = Number(vatAmount ?? Math.round(base * 0.21 * 100) / 100);
    const total = Math.round((base + vat) * 100) / 100;
    const needsApproval = total >= 500;

    const db = getDb();
    const item = {
      id: `gas-${Date.now()}`,
      companyId,
      supplierName: String(supplierName).trim(),
      supplierNif: String(supplierNif ?? '').trim().toUpperCase(),
      concept: String(concept).trim(),
      category: category || 'Otros',
      costCenter: String(costCenter || 'Administración'),
      date: String(date || todayDate()),
      subtotal: base,
      vatAmount: vat,
      total,
      status: (needsApproval ? 'Pendiente' : 'Aprobado') as 'Pendiente' | 'Aprobado',
      source: (source === 'Extracción Gemini' ? 'Extracción Gemini' : 'Manual') as 'Manual' | 'Extracción Gemini',
    };

    db.expenses.unshift(item);

    if (needsApproval) {
      db.approvals.unshift({
        id: `apr-${Date.now()}`,
        companyId,
        type: 'Gasto',
        title: `Aprobar gasto: ${item.supplierName} (${total.toFixed(2)} €)`,
        description: `${item.concept} · Centro de coste: ${item.costCenter}. Importe sujeto a autorización (≥ 500 €).`,
        amount: total,
        requestedBy: actor,
        createdAt: nowTimestamp().slice(0, 16),
        status: 'Pendiente',
        payload: { expenseId: item.id },
      });
      addNotification(
        companyId,
        'Finanzas',
        'Nuevo gasto pendiente de aprobación',
        `${item.supplierName} por ${total.toFixed(2)} € espera autorización.`
      );
      emitOutboxEvent(companyId, 'expense.pending_approval', `${item.id} · ${total.toFixed(2)} €`);
    } else {
      const company = db.companies.find((c) => c.id === companyId);
      if (company) {
        company.bankBalance = Math.round((company.bankBalance - total) * 100) / 100;
      }
    }

    recordAudit(companyId, actor, role, 'Registro de gasto', 'gastos', `${item.supplierName} (${total.toFixed(2)} €)`);
    saveDb();
    res.status(201).json({ item });
  });

  // Documents
  app.get('/api/documents', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'documentos', 'ver')) return;
    const db = getDb();
    res.json({ items: db.documents.filter((d) => d.companyId === companyId) });
  });

  app.post('/api/documents', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'documentos', 'crear')) return;
    const { title, folder, fileName, linkedEntity, summary } = req.body;
    if (!title || !fileName) {
      return res.status(400).json({ error: 'Título y nombre de archivo son obligatorios.' });
    }
    const db = getDb();
    const item = {
      id: `doc-${Date.now()}`,
      companyId,
      title: String(title).trim(),
      folder: folder || 'Informes',
      fileName: String(fileName).trim(),
      version: 'v1.0',
      uploadedBy: actor,
      updatedAt: todayDate(),
      sizeLabel: '640 KB',
      linkedEntity: linkedEntity ? String(linkedEntity) : undefined,
      summary: String(summary || 'Documento archivado en repositorio seguro.'),
    };
    db.documents.unshift(item);
    recordAudit(companyId, actor, role, 'Archivo de documento', 'documentos', item.fileName);
    emitOutboxEvent(companyId, 'document.uploaded', item.fileName);
    saveDb();
    res.status(201).json({ item });
  });

  // Tasks & Agenda
  app.get('/api/tasks', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'agenda', 'ver')) return;
    const db = getDb();
    res.json({ items: db.tasks.filter((t) => t.companyId === companyId) });
  });

  app.post('/api/tasks', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'agenda', 'crear')) return;
    const { title, dueDate, assignee, priority, category, origin } = req.body;
    if (!title) return res.status(400).json({ error: 'El título de la tarea es obligatorio.' });
    const db = getDb();
    const item = {
      id: `tar-${Date.now()}`,
      companyId,
      title: String(title).trim(),
      dueDate: String(dueDate || todayDate()),
      assignee: String(assignee || actor),
      priority: (priority === 'Alta' || priority === 'Baja' ? priority : 'Media') as 'Alta' | 'Media' | 'Baja',
      category: category || 'Operación',
      completed: false,
      origin: (origin === 'Gemini' || origin === 'n8n' ? origin : 'Manual') as 'Manual' | 'n8n' | 'Gemini',
    };
    db.tasks.unshift(item);
    recordAudit(companyId, actor, role, 'Creación de tarea', 'agenda', item.title);
    saveDb();
    res.status(201).json({ item });
  });

  app.patch('/api/tasks/:id', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'agenda', 'editar')) return;
    const db = getDb();
    const task = db.tasks.find((t) => t.id === req.params.id && t.companyId === companyId);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });
    if (typeof req.body.completed === 'boolean') {
      task.completed = req.body.completed;
    }
    recordAudit(companyId, actor, role, task.completed ? 'Tarea completada' : 'Tarea reabierta', 'agenda', task.title);
    saveDb();
    res.json({ item: task });
  });

  // Approvals
  app.get('/api/approvals', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'aprobaciones', 'ver')) return;
    const db = getDb();
    res.json({ items: db.approvals.filter((a) => a.companyId === companyId) });
  });

  app.post('/api/approvals/:id/decide', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'aprobaciones', 'aprobar')) return;
    const { decision } = req.body;
    if (decision !== 'Aprobada' && decision !== 'Rechazada') {
      return res.status(400).json({ error: 'La decisión debe ser Aprobada o Rechazada.' });
    }
    const db = getDb();
    const approval = db.approvals.find((a) => a.id === req.params.id && a.companyId === companyId);
    if (!approval) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    if (approval.status !== 'Pendiente') {
      return res.status(400).json({ error: 'Esta solicitud ya fue resuelta.' });
    }

    approval.status = decision;
    approval.decidedBy = actor;
    approval.decidedAt = nowTimestamp().slice(0, 16);

    // Propagate decision to linked expense if present
    const expenseId = approval.payload?.expenseId as string | undefined;
    if (expenseId) {
      const exp = db.expenses.find((e) => e.id === expenseId && e.companyId === companyId);
      if (exp) {
        exp.status = decision === 'Aprobada' ? 'Aprobado' : 'Rechazado';
        if (decision === 'Aprobada') {
          const company = db.companies.find((c) => c.id === companyId);
          if (company) {
            company.bankBalance = Math.round((company.bankBalance - exp.total) * 100) / 100;
          }
        }
      }
    }

    recordAudit(companyId, actor, role, `Solicitud ${decision.toLowerCase()}`, 'aprobaciones', approval.title);
    addNotification(
      companyId,
      'Administración',
      `Aprobación ${decision.toLowerCase()}`,
      `${approval.title} resuelta por ${actor}.`
    );
    emitOutboxEvent(companyId, `approval.${decision === 'Aprobada' ? 'approved' : 'rejected'}`, approval.id);
    saveDb();
    res.json({ item: approval });
  });

  // Workflows (n8n) & Transactional Outbox
  app.get('/api/workflows', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'automatizaciones', 'ver')) return;
    const db = getDb();
    res.json({
      workflows: db.workflows.filter((w) => w.companyId === companyId),
      outboxEvents: db.outboxEvents.filter((e) => e.companyId === companyId).slice(0, 20),
    });
  });

  app.post('/api/workflows/:id/toggle', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'automatizaciones', 'editar')) return;
    const db = getDb();
    const wf = db.workflows.find((w) => w.id === req.params.id && w.companyId === companyId);
    if (!wf) return res.status(404).json({ error: 'Flujo no encontrado.' });
    wf.active = !wf.active;
    recordAudit(companyId, actor, role, wf.active ? 'Flujo n8n activado' : 'Flujo n8n pausado', 'automatizaciones', wf.name);
    saveDb();
    res.json({ item: wf });
  });

  app.post('/api/workflows/:id/run', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'automatizaciones', 'editar')) return;
    const db = getDb();
    const wf = db.workflows.find((w) => w.id === req.params.id && w.companyId === companyId);
    if (!wf) return res.status(404).json({ error: 'Flujo no encontrado.' });

    wf.executionsCount += 1;
    wf.lastRunAt = nowTimestamp().slice(0, 16);
    wf.lastStatus = 'Correcto';

    let summary = `Flujo "${wf.name}" ejecutado correctamente.`;

    if (wf.name.toLowerCase().includes('vencida')) {
      const overdue = db.invoices.filter((i) => i.companyId === companyId && i.status === 'Vencida');
      summary = `Escaneadas facturas: detectadas ${overdue.length} facturas vencidas.`;
      emitOutboxEvent(companyId, 'n8n.overdue_scan.completed', `${overdue.length} vencidas`);
    } else if (wf.name.toLowerCase().includes('backup')) {
      const latestBackup = db.backups.find((b) => b.companyId === companyId);
      summary = `Verificada integridad de copia (${latestBackup?.createdAt ?? 'reciente'}) sin errores.`;
      emitOutboxEvent(companyId, 'backup.verified', latestBackup?.id ?? 'snapshot');
    } else {
      emitOutboxEvent(companyId, 'n8n.workflow.executed', wf.name);
    }

    addNotification(companyId, 'Sistema y seguridad', `Ejecución n8n: ${wf.name}`, summary);
    recordAudit(companyId, actor, role, 'Ejecución manual de flujo n8n', 'automatizaciones', wf.name);
    saveDb();
    res.json({ item: wf, summary });
  });

  // External n8n webhook configuration & test
  app.patch('/api/workflows/webhook-config', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'automatizaciones', 'editar')) return;
    const { n8nWebhookUrl, n8nSecret } = req.body;
    const db = getDb();
    const company = db.companies.find((c) => c.id === companyId);
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada.' });

    company.n8nWebhookUrl = typeof n8nWebhookUrl === 'string' ? n8nWebhookUrl.trim() : '';
    company.n8nSecret = typeof n8nSecret === 'string' ? n8nSecret.trim() : '';
    recordAudit(companyId, actor, role, 'Configuración de webhook externo n8n', 'automatizaciones', company.n8nWebhookUrl || 'Desactivado');
    saveDb();
    res.json({ n8nWebhookUrl: company.n8nWebhookUrl, n8nSecret: company.n8nSecret });
  });

  app.post('/api/workflows/test-webhook', async (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'automatizaciones', 'editar')) return;
    const db = getDb();
    const company = db.companies.find((c) => c.id === companyId);
    if (!company?.n8nWebhookUrl) {
      return res.status(400).json({ error: 'Configura primero la URL de Webhook de tu instancia n8n.' });
    }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (company.n8nSecret) headers['x-n8n-secret'] = company.n8nSecret;

      const pingRes = await fetch(company.n8nWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          eventName: 'erp.webhook_test',
          companyId,
          companyName: company.name,
          timestamp: nowTimestamp(),
          message: 'Prueba de conexión desde Núcleo ERP hacia n8n.',
        }),
      });
      emitOutboxEvent(companyId, 'erp.webhook_test', `HTTP ${pingRes.status}`);
      saveDb();
      res.json({ ok: pingRes.ok, status: pingRes.status, message: `n8n respondió con HTTP ${pingRes.status}` });
    } catch (err) {
      res.status(502).json({
        error: `No se pudo conectar con n8n: ${err instanceof Error ? err.message : 'Error de red'}`,
      });
    }
  });

  // Inbound API endpoint for external n8n workflows
  app.post('/api/integrations/n8n/inbound', async (req, res) => {
    const db = getDb();
    const companyId = String(req.body.companyId || req.headers['x-company-id'] || 'emp-iberica');
    const company = db.companies.find((c) => c.id === companyId);
    if (!company) {
      return res.status(404).json({ error: `Empresa "${companyId}" no encontrada.` });
    }

    const secretHeader = String(req.headers['x-n8n-secret'] || '');
    if (company.n8nSecret && secretHeader !== company.n8nSecret) {
      return res.status(401).json({ error: 'Token x-n8n-secret inválido o ausente.' });
    }

    const action = String(req.body.action || '');
    try {
      if (action === 'ingest_supplier_invoice') {
        const rawText = req.body.rawText ? String(req.body.rawText) : undefined;
        const fileBase64 = req.body.fileBase64 ? String(req.body.fileBase64) : undefined;
        const mimeType = req.body.mimeType ? String(req.body.mimeType) : undefined;

        const extracted =
          rawText || fileBase64
            ? await extractExpenseWithGemini({ rawText, fileBase64, mimeType })
            : {
                supplierName: String(req.body.supplierName || 'Proveedor externo'),
                supplierNif: String(req.body.supplierNif || 'Pendiente NIF'),
                concept: String(req.body.concept || 'Factura recibida vía n8n'),
                category: (req.body.category || 'Otros') as
                  | 'Suministros'
                  | 'Software'
                  | 'Servicios profesionales'
                  | 'Viajes'
                  | 'Material'
                  | 'Otros',
                date: String(req.body.date || todayDate()),
                subtotal: Number(req.body.subtotal ?? 0),
                vatAmount: Number(req.body.vatAmount ?? 0),
                total: Number(req.body.total ?? 0),
              };

        const total = extracted.total || Math.round((extracted.subtotal + extracted.vatAmount) * 100) / 100;
        const exp = {
          id: `gas-${Date.now()}`,
          companyId,
          supplierName: extracted.supplierName,
          supplierNif: extracted.supplierNif,
          concept: extracted.concept,
          category: extracted.category,
          costCenter: String(req.body.costCenter || 'Administración'),
          date: extracted.date,
          subtotal: extracted.subtotal,
          vatAmount: extracted.vatAmount,
          total,
          status: 'Pendiente' as const,
          source: 'Extracción Gemini' as const,
        };
        db.expenses.unshift(exp);
        db.approvals.unshift({
          id: `apr-${Date.now()}`,
          companyId,
          type: 'Gasto',
          title: `Validar factura vía n8n: ${exp.supplierName} (${total.toFixed(2)} €)`,
          description: `${exp.concept} · Ingresada automáticamente por n8n para confirmación humana.`,
          amount: total,
          requestedBy: 'n8n Inbound',
          createdAt: nowTimestamp().slice(0, 16),
          status: 'Pendiente',
          payload: { expenseId: exp.id },
        });
        addNotification(companyId, 'Finanzas', `Factura recibida vía n8n`, `${exp.supplierName} (${total.toFixed(2)} €) lista para aprobar.`);
        recordAudit(companyId, 'n8n Webhook', 'administracion', 'Ingesta automática de factura', 'gastos', exp.supplierName);
        saveDb();
        return res.status(201).json({ ok: true, expense: exp });
      }

      if (action === 'scan_overdue') {
        const overdue = db.invoices.filter((i) => i.companyId === companyId && i.status === 'Vencida');
        for (const inv of overdue) {
          const exists = db.tasks.some((t) => t.companyId === companyId && !t.completed && t.title.includes(inv.number));
          if (!exists) {
            db.tasks.unshift({
              id: `tar-${Date.now()}-${Math.floor(Math.random() * 100)}`,
              companyId,
              title: `Seguimiento cobro vencido ${inv.number} (${inv.customerName})`,
              dueDate: todayDate(),
              assignee: 'Administración',
              priority: 'Alta',
              category: 'Cobro',
              completed: false,
              origin: 'n8n',
            });
          }
        }
        recordAudit(companyId, 'n8n Webhook', 'administracion', 'Escaneo de facturas vencidas', 'facturacion', `${overdue.length} vencidas`);
        saveDb();
        return res.json({
          ok: true,
          overdueCount: overdue.length,
          overdueInvoices: overdue.map((i) => ({
            number: i.number,
            customerName: i.customerName,
            dueDate: i.dueDate,
            total: i.total,
          })),
        });
      }

      if (action === 'create_task') {
        const task = {
          id: `tar-${Date.now()}`,
          companyId,
          title: String(req.body.title || 'Tarea creada desde n8n'),
          dueDate: String(req.body.dueDate || todayDate()),
          assignee: String(req.body.assignee || 'Administración'),
          priority: (req.body.priority === 'Alta' || req.body.priority === 'Baja' ? req.body.priority : 'Media') as
            | 'Alta'
            | 'Media'
            | 'Baja',
          category: (req.body.category || 'Operación') as 'Cobro' | 'Contrato' | 'Fiscal' | 'Operación',
          completed: false,
          origin: 'n8n' as const,
        };
        db.tasks.unshift(task);
        addNotification(companyId, 'Personas y tareas', 'Nueva tarea automática desde n8n', task.title);
        recordAudit(companyId, 'n8n Webhook', 'administracion', 'Creación de tarea desde n8n', 'agenda', task.title);
        saveDb();
        return res.status(201).json({ ok: true, task });
      }

      if (action === 'monthly_closing_summary') {
        const invs = db.invoices.filter((i) => i.companyId === companyId && i.type === 'Factura');
        const exps = db.expenses.filter((e) => e.companyId === companyId && e.status !== 'Rechazado');
        const totalBilled = invs.reduce((s, i) => s + i.total, 0);
        const totalExpenses = exps.reduce((s, e) => s + e.total, 0);
        return res.json({
          ok: true,
          company: company.name,
          nif: company.nif,
          bankBalance: company.bankBalance,
          totalBilled,
          totalExpenses,
          estimatedProfit: totalBilled - totalExpenses,
          overdueCount: invs.filter((i) => i.status === 'Vencida').length,
        });
      }

      return res.status(400).json({
        error: 'Acción no reconocida. Usa: ingest_supplier_invoice, scan_overdue, create_task o monthly_closing_summary.',
      });
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Error procesando webhook n8n.' });
    }
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'notificaciones', 'ver')) return;
    const db = getDb();
    res.json({ items: db.notifications.filter((n) => n.companyId === companyId) });
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'notificaciones', 'editar')) return;
    const db = getDb();
    const item = db.notifications.find((n) => n.id === req.params.id && n.companyId === companyId);
    if (!item) return res.status(404).json({ error: 'Notificación no encontrada.' });
    item.read = true;
    saveDb();
    res.json({ item });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'notificaciones', 'editar')) return;
    const db = getDb();
    for (const n of db.notifications) {
      if (n.companyId === companyId) n.read = true;
    }
    saveDb();
    res.json({ ok: true });
  });

  // System: Audit, Backups, Role Matrix & Module Configuration
  app.get('/api/system', (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'sistema', 'ver')) return;
    const db = getDb();
    const company = db.companies.find((c) => c.id === companyId)!;
    res.json({
      auditLogs: db.auditLogs.filter((a) => a.companyId === companyId).slice(0, 50),
      backups: db.backups.filter((b) => b.companyId === companyId),
      roles: Object.values(ROLES),
      enabledModules: company.enabledModules,
    });
  });

  app.post('/api/backups', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'sistema', 'crear')) return;
    const db = getDb();
    const bkp = {
      id: `bkp-${Date.now()}`,
      companyId,
      createdAt: nowTimestamp().slice(0, 16),
      type: (req.body.type === 'Completa' ? 'Completa' : 'Incremental') as 'Completa' | 'Incremental',
      sizeMb: req.body.type === 'Completa' ? 324.6 : 45.2,
      integrityStatus: 'Verificada' as const,
      storageTarget: 'S3 Inmutable · eu-west-1',
    };
    db.backups.unshift(bkp);
    recordAudit(companyId, actor, role, `Copia de seguridad ${bkp.type.toLowerCase()}`, 'sistema', bkp.id);
    addNotification(companyId, 'Sistema y seguridad', 'Copia de seguridad completada', `Snapshot ${bkp.type} verificado en ${bkp.storageTarget}.`);
    saveDb();
    res.status(201).json({ item: bkp });
  });

  app.get('/api/backups/export', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'sistema', 'exportar')) return;
    const db = getDb();
    const company = db.companies.find((c) => c.id === companyId);
    const exportData = {
      exportedAt: nowTimestamp(),
      company,
      customers: db.customers.filter((x) => x.companyId === companyId),
      suppliers: db.suppliers.filter((x) => x.companyId === companyId),
      invoices: db.invoices.filter((x) => x.companyId === companyId),
      expenses: db.expenses.filter((x) => x.companyId === companyId),
      documents: db.documents.filter((x) => x.companyId === companyId),
      tasks: db.tasks.filter((x) => x.companyId === companyId),
    };
    recordAudit(companyId, actor, role, 'Exportación de respaldo JSON', 'sistema', company?.name ?? companyId);
    saveDb();
    res.setHeader('Content-Disposition', `attachment; filename="respaldo-${companyId}-${todayDate()}.json"`);
    res.json(exportData);
  });

  app.patch('/api/company/modules', (req, res) => {
    const { companyId, role, actor } = getContext(req);
    if (!requirePerm(res, role, 'sistema', 'editar')) return;
    const { enabledModules } = req.body;
    if (!Array.isArray(enabledModules)) {
      return res.status(400).json({ error: 'Formato inválido de módulos.' });
    }
    const db = getDb();
    const company = db.companies.find((c) => c.id === companyId);
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada.' });

    // Core dashboard & system remain always active
    const required: ModuleId[] = ['dashboard', 'sistema'];
    const merged = Array.from(new Set([...required, ...enabledModules])) as ModuleId[];
    company.enabledModules = merged;
    recordAudit(companyId, actor, role, 'Actualización de módulos activos', 'sistema', `${merged.length} módulos`);
    saveDb();
    res.json({ enabledModules: company.enabledModules });
  });

  // Gemini AI endpoints (server-side only)
  app.post('/api/ai/chat', async (req, res) => {
    const { companyId, role } = getContext(req);
    if (!requirePerm(res, role, 'asistente', 'ver')) return;
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'El mensaje es obligatorio.' });
    }
    try {
      const result = await runErpAssistantChat({
        companyId,
        role,
        message,
        history: Array.isArray(history) ? history : [],
      });
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error consultando al asistente Gemini.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/ai/briefing', async (req, res) => {
    const { companyId, role } = getContext(req);
    try {
      const briefing = await generateExecutiveBriefing(companyId, role);
      res.json(briefing);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error generando el resumen ejecutivo.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/ai/extract', async (req, res) => {
    const { role } = getContext(req);
    if (!requirePerm(res, role, 'gastos', 'crear')) return;
    const { rawText, fileBase64, mimeType } = req.body;
    if (!rawText && !fileBase64) {
      return res.status(400).json({ error: 'Proporciona el texto o archivo de la factura/ticket.' });
    }
    try {
      const extracted = await extractExpenseWithGemini({ rawText, fileBase64, mimeType });
      res.json({ extracted });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error extrayendo datos del documento.';
      res.status(500).json({ error: msg });
    }
  });

  // Vite dev middleware or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Núcleo ERP servidor ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
