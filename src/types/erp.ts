export type RoleId =
  | 'direccion'
  | 'administracion'
  | 'contabilidad'
  | 'comercial'
  | 'auditor';

export type ModuleId =
  | 'dashboard'
  | 'clientes'
  | 'proveedores'
  | 'facturacion'
  | 'gastos'
  | 'documentos'
  | 'agenda'
  | 'aprobaciones'
  | 'automatizaciones'
  | 'asistente'
  | 'notificaciones'
  | 'sistema';

export type PermissionAction =
  | 'ver'
  | 'crear'
  | 'editar'
  | 'aprobar'
  | 'eliminar'
  | 'exportar';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  description: string;
  permissions: Record<ModuleId, PermissionAction[]>;
}

export interface Company {
  id: string;
  name: string;
  nif: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  iban: string;
  plan: 'Essential' | 'Business' | 'Enterprise';
  bankBalance: number;
  enabledModules: ModuleId[];
  n8nWebhookUrl?: string;
  n8nSecret?: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  nif: string;
  email: string;
  phone: string;
  city: string;
  contactPerson: string;
  status: 'Activo' | 'En revisión' | 'Inactivo';
  totalBilled: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  nif: string;
  category: string;
  email: string;
  phone: string;
  contactPerson: string;
  status: 'Homologado' | 'Pendiente' | 'Bloqueado';
  totalPurchased: number;
  createdAt: string;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  number: string;
  type: 'Factura' | 'Presupuesto' | 'Rectificativa';
  customerId: string;
  customerName: string;
  customerNif: string;
  issueDate: string;
  dueDate: string;
  status: 'Cobrada' | 'Pendiente' | 'Vencida' | 'Borrador';
  lines: InvoiceLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  notes?: string;
}

export interface Expense {
  id: string;
  companyId: string;
  supplierId?: string;
  supplierName: string;
  supplierNif: string;
  concept: string;
  category: 'Suministros' | 'Software' | 'Servicios profesionales' | 'Viajes' | 'Material' | 'Otros';
  costCenter: string;
  date: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  status: 'Aprobado' | 'Pendiente' | 'Rechazado';
  source: 'Manual' | 'Extracción Gemini';
}

export interface DocumentItem {
  id: string;
  companyId: string;
  title: string;
  folder: 'Facturas' | 'Contratos' | 'Certificados' | 'Informes';
  fileName: string;
  version: string;
  uploadedBy: string;
  updatedAt: string;
  sizeLabel: string;
  linkedEntity?: string;
  summary: string;
}

export interface TaskItem {
  id: string;
  companyId: string;
  title: string;
  dueDate: string;
  assignee: string;
  priority: 'Alta' | 'Media' | 'Baja';
  category: 'Cobro' | 'Contrato' | 'Fiscal' | 'Operación';
  completed: boolean;
  origin: 'Manual' | 'n8n' | 'Gemini';
}

export interface ApprovalRequest {
  id: string;
  companyId: string;
  type: 'Gasto' | 'Factura' | 'Contrato' | 'Acción Gemini';
  title: string;
  description: string;
  amount?: number;
  requestedBy: string;
  createdAt: string;
  status: 'Pendiente' | 'Aprobada' | 'Rechazada';
  decidedBy?: string;
  decidedAt?: string;
  payload?: Record<string, unknown>;
}

export interface WorkflowRule {
  id: string;
  companyId: string;
  name: string;
  trigger: string;
  description: string;
  active: boolean;
  lastRunAt: string;
  executionsCount: number;
  lastStatus: 'Correcto' | 'Pendiente' | 'Error';
}

export interface OutboxEvent {
  id: string;
  companyId: string;
  eventName: string;
  entityRef: string;
  status: 'Enviado a n8n' | 'Procesando' | 'En cola' | 'Error de envío';
  deliveryDetail?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  companyId: string;
  category: 'Finanzas' | 'Administración' | 'Personas y tareas' | 'Sistema y seguridad';
  title: string;
  message: string;
  priority: 'Alta' | 'Normal';
  read: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  companyId: string;
  actor: string;
  role: RoleId;
  action: string;
  module: ModuleId;
  target: string;
  timestamp: string;
}

export interface BackupRecord {
  id: string;
  companyId: string;
  createdAt: string;
  type: 'Completa' | 'Incremental';
  sizeMb: number;
  integrityStatus: 'Verificada' | 'Pendiente';
  storageTarget: string;
}

export interface ErpProposalAction {
  proposalId: string;
  actionType: 'create_invoice_draft' | 'create_expense_draft' | 'create_task';
  title: string;
  summary: string;
  amount?: number;
  data: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  proposal?: ErpProposalAction;
  proposalStatus?: 'pending' | 'confirmed' | 'cancelled';
}
