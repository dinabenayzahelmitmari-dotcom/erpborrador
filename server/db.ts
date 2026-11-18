import fs from 'fs';
import path from 'path';
import type {
  ApprovalRequest,
  AuditEntry,
  BackupRecord,
  Company,
  Customer,
  DocumentItem,
  Expense,
  Invoice,
  ModuleId,
  NotificationItem,
  OutboxEvent,
  RoleId,
  Supplier,
  TaskItem,
  WorkflowRule,
} from '../src/types/erp.ts';

export interface ErpDatabase {
  companies: Company[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: Invoice[];
  expenses: Expense[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  approvals: ApprovalRequest[];
  workflows: WorkflowRule[];
  outboxEvents: OutboxEvent[];
  notifications: NotificationItem[];
  auditLogs: AuditEntry[];
  backups: BackupRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'erp-store.json');

const ALL_MODULES: ModuleId[] = [
  'dashboard',
  'clientes',
  'proveedores',
  'facturacion',
  'gastos',
  'documentos',
  'agenda',
  'aprobaciones',
  'automatizaciones',
  'asistente',
  'notificaciones',
  'sistema',
];

function createSeedDatabase(): ErpDatabase {
  return {
    companies: [
      {
        id: 'emp-iberica',
        name: 'Grupo Ibérica Industrial S.L.',
        nif: 'B84920145',
        address: 'Paseo de la Castellana 142, Planta 4',
        city: '28046 Madrid',
        email: 'administracion@grupoiberica.es',
        phone: '+34 914 820 310',
        iban: 'ES68 2100 0418 4502 0005 1332',
        plan: 'Business',
        bankBalance: 148650.40,
        enabledModules: [...ALL_MODULES],
      },
      {
        id: 'emp-norte',
        name: 'Ibérica Servicios Norte S.A.',
        nif: 'A48391022',
        address: 'Gran Vía Don Diego López de Haro 45',
        city: '48011 Bilbao',
        email: 'finanzas@ibericanorte.es',
        phone: '+34 944 105 920',
        iban: 'ES12 0049 1500 0512 3456 7892',
        plan: 'Enterprise',
        bankBalance: 92410.00,
        enabledModules: [...ALL_MODULES],
      },
    ],
    customers: [
      {
        id: 'cli-1',
        companyId: 'emp-iberica',
        name: 'Construcciones Levantinas S.A.',
        nif: 'A46210984',
        email: 'pagos@levantinas.es',
        phone: '+34 963 201 440',
        city: 'Valencia',
        contactPerson: 'Marta Valero',
        status: 'Activo',
        totalBilled: 42850.00,
        createdAt: '2026-03-14',
      },
      {
        id: 'cli-2',
        companyId: 'emp-iberica',
        name: 'Logística Península S.L.',
        nif: 'B81904412',
        email: 'facturas@logisticapeninsula.es',
        phone: '+34 917 440 120',
        city: 'Madrid',
        contactPerson: 'Carlos Mendoza',
        status: 'Activo',
        totalBilled: 28400.00,
        createdAt: '2026-04-02',
      },
      {
        id: 'cli-3',
        companyId: 'emp-iberica',
        name: 'Distribuciones del Sur S.L.U.',
        nif: 'B41098231',
        email: 'administracion@distsur.es',
        phone: '+34 954 318 090',
        city: 'Sevilla',
        contactPerson: 'Elena Morales',
        status: 'En revisión',
        totalBilled: 11250.00,
        createdAt: '2026-06-19',
      },
      {
        id: 'cli-4',
        companyId: 'emp-iberica',
        name: 'Tecnología y Redes Catalunya S.L.',
        nif: 'B65401928',
        email: 'cuentas@trcatalunya.es',
        phone: '+34 932 908 115',
        city: 'Barcelona',
        contactPerson: 'Jordi Puig',
        status: 'Activo',
        totalBilled: 35600.00,
        createdAt: '2026-07-08',
      },
      {
        id: 'cli-5',
        companyId: 'emp-norte',
        name: 'Astilleros Cantábrico S.A.',
        nif: 'A39104821',
        email: 'compras@astilleroscantabrico.es',
        phone: '+34 942 880 150',
        city: 'Santander',
        contactPerson: 'Iñaki Etxebarria',
        status: 'Activo',
        totalBilled: 54200.00,
        createdAt: '2026-02-20',
      },
      {
        id: 'cli-6',
        companyId: 'emp-norte',
        name: 'Energías Renovables Euskadi S.L.',
        nif: 'B95412098',
        email: 'facturacion@ereuskadi.es',
        phone: '+34 944 670 300',
        city: 'Bilbao',
        contactPerson: 'Nerea Aguirre',
        status: 'Activo',
        totalBilled: 29800.00,
        createdAt: '2026-05-11',
      },
    ],
    suppliers: [
      {
        id: 'prov-1',
        companyId: 'emp-iberica',
        name: 'Suministros Eléctricos del Centro S.L.',
        nif: 'B28940112',
        category: 'Suministros',
        email: 'cobros@sec-centro.es',
        phone: '+34 915 330 210',
        contactPerson: 'Javier Ruiz',
        status: 'Homologado',
        totalPurchased: 14620.00,
        createdAt: '2026-01-18',
      },
      {
        id: 'prov-2',
        companyId: 'emp-iberica',
        name: 'Asesoría Fiscal y Legal Ortega',
        nif: 'B83120944',
        category: 'Servicios profesionales',
        email: 'facturacion@ortegaasociados.es',
        phone: '+34 913 880 540',
        contactPerson: 'Lucía Ortega',
        status: 'Homologado',
        totalPurchased: 9800.00,
        createdAt: '2026-02-04',
      },
      {
        id: 'prov-3',
        companyId: 'emp-iberica',
        name: 'Cloud & Infraestructura Ibérica S.A.',
        nif: 'A87019283',
        category: 'Software',
        email: 'billing@cloudiberica.es',
        phone: '+34 910 220 800',
        contactPerson: 'Raúl Navarro',
        status: 'Homologado',
        totalPurchased: 6420.00,
        createdAt: '2026-03-22',
      },
      {
        id: 'prov-4',
        companyId: 'emp-norte',
        name: 'Aceros y Perfiles del Norte S.L.',
        nif: 'B48019234',
        category: 'Material',
        email: 'pedidos@acerosnorte.es',
        phone: '+34 944 210 770',
        contactPerson: 'Aitor Bilbao',
        status: 'Homologado',
        totalPurchased: 22450.00,
        createdAt: '2026-02-12',
      },
    ],
    invoices: [
      {
        id: 'fac-1',
        companyId: 'emp-iberica',
        number: 'FAC-2026-0142',
        type: 'Factura',
        customerId: 'cli-1',
        customerName: 'Construcciones Levantinas S.A.',
        customerNif: 'A46210984',
        issueDate: '2026-11-02',
        dueDate: '2026-12-02',
        status: 'Cobrada',
        lines: [
          { description: 'Mantenimiento preventivo instalaciones industriales', quantity: 1, unitPrice: 8500, vatRate: 21 },
          { description: 'Auditoría energética y certificación técnica', quantity: 2, unitPrice: 2400, vatRate: 21 },
        ],
        subtotal: 13300.00,
        vatAmount: 2793.00,
        total: 16093.00,
        notes: 'Pago recibido mediante transferencia SEPA.',
      },
      {
        id: 'fac-2',
        companyId: 'emp-iberica',
        number: 'FAC-2026-0143',
        type: 'Factura',
        customerId: 'cli-2',
        customerName: 'Logística Península S.L.',
        customerNif: 'B81904412',
        issueDate: '2026-11-08',
        dueDate: '2026-11-28',
        status: 'Pendiente',
        lines: [
          { description: 'Integración de terminales de almacén', quantity: 4, unitPrice: 1950, vatRate: 21 },
        ],
        subtotal: 7800.00,
        vatAmount: 1638.00,
        total: 9438.00,
        notes: 'Vencimiento a 20 días.',
      },
      {
        id: 'fac-3',
        companyId: 'emp-iberica',
        number: 'FAC-2026-0136',
        type: 'Factura',
        customerId: 'cli-3',
        customerName: 'Distribuciones del Sur S.L.U.',
        customerNif: 'B41098231',
        issueDate: '2026-10-10',
        dueDate: '2026-11-10',
        status: 'Vencida',
        lines: [
          { description: 'Suministro de equipamiento modular de nave', quantity: 1, unitPrice: 5400, vatRate: 21 },
        ],
        subtotal: 5400.00,
        vatAmount: 1134.00,
        total: 6534.00,
        notes: 'Pendiente de reclamación amistosa.',
      },
      {
        id: 'fac-4',
        companyId: 'emp-iberica',
        number: 'FAC-2026-0144',
        type: 'Factura',
        customerId: 'cli-4',
        customerName: 'Tecnología y Redes Catalunya S.L.',
        customerNif: 'B65401928',
        issueDate: '2026-11-14',
        dueDate: '2026-12-14',
        status: 'Pendiente',
        lines: [
          { description: 'Consultoría de arquitectura de sistemas', quantity: 1, unitPrice: 6200, vatRate: 21 },
          { description: 'Soporte mensual SLA avanzado', quantity: 1, unitPrice: 1800, vatRate: 21 },
        ],
        subtotal: 8000.00,
        vatAmount: 1680.00,
        total: 9680.00,
      },
      {
        id: 'fac-5',
        companyId: 'emp-iberica',
        number: 'PRE-2026-0089',
        type: 'Presupuesto',
        customerId: 'cli-1',
        customerName: 'Construcciones Levantinas S.A.',
        customerNif: 'A46210984',
        issueDate: '2026-11-16',
        dueDate: '2026-12-16',
        status: 'Borrador',
        lines: [
          { description: 'Ampliación cuadro de control planta 2', quantity: 1, unitPrice: 11200, vatRate: 21 },
        ],
        subtotal: 11200.00,
        vatAmount: 2352.00,
        total: 13552.00,
        notes: 'Pendiente de aceptación por cliente.',
      },
      {
        id: 'fac-6',
        companyId: 'emp-norte',
        number: 'NOR-2026-0071',
        type: 'Factura',
        customerId: 'cli-5',
        customerName: 'Astilleros Cantábrico S.A.',
        customerNif: 'A39104821',
        issueDate: '2026-11-05',
        dueDate: '2026-12-05',
        status: 'Cobrada',
        lines: [
          { description: 'Servicio técnico de inspección naval', quantity: 1, unitPrice: 14500, vatRate: 21 },
        ],
        subtotal: 14500.00,
        vatAmount: 3045.00,
        total: 17545.00,
      },
      {
        id: 'fac-7',
        companyId: 'emp-norte',
        number: 'NOR-2026-0072',
        type: 'Factura',
        customerId: 'cli-6',
        customerName: 'Energías Renovables Euskadi S.L.',
        customerNif: 'B95412098',
        issueDate: '2026-11-12',
        dueDate: '2026-12-12',
        status: 'Pendiente',
        lines: [
          { description: 'Mantenimiento subestación solar Bilbao', quantity: 1, unitPrice: 9200, vatRate: 21 },
        ],
        subtotal: 9200.00,
        vatAmount: 1932.00,
        total: 11132.00,
      },
    ],
    expenses: [
      {
        id: 'gas-1',
        companyId: 'emp-iberica',
        supplierId: 'prov-1',
        supplierName: 'Suministros Eléctricos del Centro S.L.',
        supplierNif: 'B28940112',
        concept: 'Material eléctrico para proyecto Valencia',
        category: 'Suministros',
        costCenter: 'Operaciones',
        date: '2026-11-04',
        subtotal: 3200.00,
        vatAmount: 672.00,
        total: 3872.00,
        status: 'Aprobado',
        source: 'Manual',
      },
      {
        id: 'gas-2',
        companyId: 'emp-iberica',
        supplierId: 'prov-2',
        supplierName: 'Asesoría Fiscal y Legal Ortega',
        supplierNif: 'B83120944',
        concept: 'Iguala mensual asesoría fiscal y laboral',
        category: 'Servicios profesionales',
        costCenter: 'Administración',
        date: '2026-11-09',
        subtotal: 1450.00,
        vatAmount: 304.50,
        total: 1754.50,
        status: 'Aprobado',
        source: 'Manual',
      },
      {
        id: 'gas-3',
        companyId: 'emp-iberica',
        supplierId: 'prov-3',
        supplierName: 'Cloud & Infraestructura Ibérica S.A.',
        supplierNif: 'A87019283',
        concept: 'Servidores dedicados y almacenamiento S3 noviembre',
        category: 'Software',
        costCenter: 'Tecnología',
        date: '2026-11-15',
        subtotal: 890.00,
        vatAmount: 186.90,
        total: 1076.90,
        status: 'Pendiente',
        source: 'Extracción Gemini',
      },
      {
        id: 'gas-4',
        companyId: 'emp-norte',
        supplierId: 'prov-4',
        supplierName: 'Aceros y Perfiles del Norte S.L.',
        supplierNif: 'B48019234',
        concept: 'Lote perfiles estructurales acero inoxidable',
        category: 'Material',
        costCenter: 'Producción',
        date: '2026-11-10',
        subtotal: 6800.00,
        vatAmount: 1428.00,
        total: 8228.00,
        status: 'Aprobado',
        source: 'Manual',
      },
    ],
    documents: [
      {
        id: 'doc-1',
        companyId: 'emp-iberica',
        title: 'Contrato marco mantenimiento Construcciones Levantinas',
        folder: 'Contratos',
        fileName: 'contrato-levantinas-2026-v2.pdf',
        version: 'v2.1',
        uploadedBy: 'Marta Serrano',
        updatedAt: '2026-11-03',
        sizeLabel: '1.4 MB',
        linkedEntity: 'Construcciones Levantinas S.A.',
        summary: 'Acuerdo anual de mantenimiento preventivo con renovación automática y preaviso de 30 días.',
      },
      {
        id: 'doc-2',
        companyId: 'emp-iberica',
        title: 'Certificado corriente de pagos Seguridad Social',
        folder: 'Certificados',
        fileName: 'certificado-tgss-nov2026.pdf',
        version: 'v1.0',
        uploadedBy: 'Carlos Ruiz',
        updatedAt: '2026-11-01',
        sizeLabel: '420 KB',
        linkedEntity: 'Grupo Ibérica Industrial S.L.',
        summary: 'Certificado oficial positivo vigente hasta el 31 de enero de 2027.',
      },
      {
        id: 'doc-3',
        companyId: 'emp-iberica',
        title: 'Cierre financiero octubre 2026',
        folder: 'Informes',
        fileName: 'informe-cierre-oct-2026.pdf',
        version: 'v1.0',
        uploadedBy: 'Automatización n8n',
        updatedAt: '2026-11-02',
        sizeLabel: '2.1 MB',
        linkedEntity: 'Dirección Financiera',
        summary: 'Informe consolidado de ingresos, gastos por centro de coste y previsión de tesorería.',
      },
      {
        id: 'doc-4',
        companyId: 'emp-norte',
        title: 'Homologación técnica Astilleros Cantábrico',
        folder: 'Certificados',
        fileName: 'homologacion-astilleros-2026.pdf',
        version: 'v1.2',
        uploadedBy: 'Nerea Aguirre',
        updatedAt: '2026-10-28',
        sizeLabel: '980 KB',
        linkedEntity: 'Astilleros Cantábrico S.A.',
        summary: 'Documentación de homologación y prevención de riesgos laborales validada.',
      },
    ],
    tasks: [
      {
        id: 'tar-1',
        companyId: 'emp-iberica',
        title: 'Reclamar cobro factura vencida FAC-2026-0136 (Distribuciones del Sur)',
        dueDate: '2026-11-19',
        assignee: 'Carlos Ruiz',
        priority: 'Alta',
        category: 'Cobro',
        completed: false,
        origin: 'n8n',
      },
      {
        id: 'tar-2',
        companyId: 'emp-iberica',
        title: 'Revisar renovación contrato Logística Península antes de fin de mes',
        dueDate: '2026-11-25',
        assignee: 'Marta Serrano',
        priority: 'Media',
        category: 'Contrato',
        completed: false,
        origin: 'Manual',
      },
      {
        id: 'tar-3',
        companyId: 'emp-iberica',
        title: 'Preparar borrador liquidación IVA trimestral',
        dueDate: '2026-12-05',
        assignee: 'Lucía Ortega',
        priority: 'Media',
        category: 'Fiscal',
        completed: false,
        origin: 'Manual',
      },
      {
        id: 'tar-4',
        companyId: 'emp-norte',
        title: 'Validar certificado PRL para subestación Bilbao',
        dueDate: '2026-11-22',
        assignee: 'Aitor Bilbao',
        priority: 'Alta',
        category: 'Operación',
        completed: false,
        origin: 'Manual',
      },
    ],
    approvals: [
      {
        id: 'apr-1',
        companyId: 'emp-iberica',
        type: 'Gasto',
        title: 'Aprobar factura Cloud & Infraestructura Ibérica (1.076,90 €)',
        description: 'Gasto extraído automáticamente desde PDF de proveedor. Importe superior a 1.000 € requiere validación.',
        amount: 1076.90,
        requestedBy: 'Administración',
        createdAt: '2026-11-15 11:20',
        status: 'Pendiente',
        payload: { expenseId: 'gas-3' },
      },
      {
        id: 'apr-2',
        companyId: 'emp-iberica',
        type: 'Factura',
        title: 'Autorizar envío de recordatorio de cobro FAC-2026-0136',
        description: 'Flujo n8n detectó vencimiento superado hace 8 días. Requiere confirmación humana antes de enviar correo formal.',
        amount: 6534.00,
        requestedBy: 'Flujo n8n · Factura vencida',
        createdAt: '2026-11-18 09:00',
        status: 'Pendiente',
        payload: { invoiceId: 'fac-3' },
      },
    ],
    workflows: [
      {
        id: 'wf-1',
        companyId: 'emp-iberica',
        name: 'Detección de facturas vencidas',
        trigger: 'Horario · Diario 08:30 / Evento invoice.overdue',
        description: 'Detecta facturas vencidas, crea tarea de seguimiento, notifica a administración y solicita autorización antes de enviar recordatorio.',
        active: true,
        lastRunAt: '2026-11-18 08:30',
        executionsCount: 24,
        lastStatus: 'Correcto',
      },
      {
        id: 'wf-2',
        companyId: 'emp-iberica',
        name: 'Procesamiento de factura de proveedor',
        trigger: 'Webhook / Evento document.uploaded',
        description: 'Recibe documento, Gemini extrae datos estructurados, comprueba duplicados y crea borrador de gasto para aprobación.',
        active: true,
        lastRunAt: '2026-11-15 11:18',
        executionsCount: 19,
        lastStatus: 'Correcto',
      },
      {
        id: 'wf-3',
        companyId: 'emp-iberica',
        name: 'Cierre mensual automático',
        trigger: 'Horario · Día 1 de cada mes 07:00',
        description: 'Recopila métricas de facturación y gastos, genera informe de cierre en Gestión Documental y notifica a Dirección.',
        active: true,
        lastRunAt: '2026-11-01 07:00',
        executionsCount: 10,
        lastStatus: 'Correcto',
      },
      {
        id: 'wf-4',
        companyId: 'emp-iberica',
        name: 'Verificación de integridad de backups',
        trigger: 'Horario · Cada 6 horas / Evento backup.completed',
        description: 'Verifica la integridad de copias externas en S3 y dispara alerta prioritaria si detecta anomalías.',
        active: true,
        lastRunAt: '2026-11-18 06:00',
        executionsCount: 112,
        lastStatus: 'Correcto',
      },
      {
        id: 'wf-5',
        companyId: 'emp-norte',
        name: 'Control de vencimientos y PRL',
        trigger: 'Horario · Diario 09:00',
        description: 'Comprueba facturas pendientes y certificados de homologación próximos a caducar.',
        active: true,
        lastRunAt: '2026-11-18 09:00',
        executionsCount: 15,
        lastStatus: 'Correcto',
      },
    ],
    outboxEvents: [
      {
        id: 'evt-1',
        companyId: 'emp-iberica',
        eventName: 'invoice.overdue',
        entityRef: 'FAC-2026-0136',
        status: 'Enviado a n8n',
        createdAt: '2026-11-18 08:30',
      },
      {
        id: 'evt-2',
        companyId: 'emp-iberica',
        eventName: 'expense.pending_approval',
        entityRef: 'gas-3 · 1.076,90 €',
        status: 'Enviado a n8n',
        createdAt: '2026-11-15 11:20',
      },
      {
        id: 'evt-3',
        companyId: 'emp-iberica',
        eventName: 'payment.received',
        entityRef: 'FAC-2026-0142',
        status: 'Enviado a n8n',
        createdAt: '2026-11-12 16:04',
      },
    ],
    notifications: [
      {
        id: 'not-1',
        companyId: 'emp-iberica',
        category: 'Finanzas',
        title: 'Factura vencida: FAC-2026-0136',
        message: 'Distribuciones del Sur S.L.U. tiene pendiente el abono de 6.534,00 € vencido el 10/11/2026.',
        priority: 'Alta',
        read: false,
        createdAt: '2026-11-18 08:31',
      },
      {
        id: 'not-2',
        companyId: 'emp-iberica',
        category: 'Finanzas',
        title: 'Gasto pendiente de aprobación',
        message: 'Cloud & Infraestructura Ibérica (1.076,90 €) requiere validación en el módulo de Aprobaciones.',
        priority: 'Normal',
        read: false,
        createdAt: '2026-11-15 11:21',
      },
      {
        id: 'not-3',
        companyId: 'emp-iberica',
        category: 'Sistema y seguridad',
        title: 'Copia de seguridad verificada',
        message: 'Snapshot incremental completado e integridad comprobada sin incidencias (RPO 5 min).',
        priority: 'Normal',
        read: true,
        createdAt: '2026-11-18 06:02',
      },
      {
        id: 'not-4',
        companyId: 'emp-norte',
        category: 'Administración',
        title: 'Factura emitida NOR-2026-0072',
        message: 'Registrada factura para Energías Renovables Euskadi S.L. por 11.132,00 €.',
        priority: 'Normal',
        read: false,
        createdAt: '2026-11-12 10:15',
      },
    ],
    auditLogs: [
      {
        id: 'aud-1',
        companyId: 'emp-iberica',
        actor: 'Carlos Ruiz',
        role: 'contabilidad',
        action: 'Registro de cobro completo',
        module: 'facturacion',
        target: 'FAC-2026-0142 (16.093,00 €)',
        timestamp: '2026-11-12 16:04:12',
      },
      {
        id: 'aud-2',
        companyId: 'emp-iberica',
        actor: 'Asistente Gemini (vía Administración)',
        role: 'administracion',
        action: 'Extracción estructurada de factura de proveedor',
        module: 'gastos',
        target: 'Cloud & Infraestructura Ibérica S.A.',
        timestamp: '2026-11-15 11:19:45',
      },
      {
        id: 'aud-3',
        companyId: 'emp-iberica',
        actor: 'Flujo n8n',
        role: 'administracion',
        action: 'Creación automática de tarea por vencimiento',
        module: 'agenda',
        target: 'FAC-2026-0136',
        timestamp: '2026-11-18 08:30:05',
      },
    ],
    backups: [
      {
        id: 'bkp-1',
        companyId: 'emp-iberica',
        createdAt: '2026-11-18 06:00',
        type: 'Incremental',
        sizeMb: 42.8,
        integrityStatus: 'Verificada',
        storageTarget: 'S3 Inmutable · eu-west-1',
      },
      {
        id: 'bkp-2',
        companyId: 'emp-iberica',
        createdAt: '2026-11-17 23:00',
        type: 'Completa',
        sizeMb: 318.4,
        integrityStatus: 'Verificada',
        storageTarget: 'S3 Inmutable · eu-west-1',
      },
      {
        id: 'bkp-3',
        companyId: 'emp-norte',
        createdAt: '2026-11-18 06:00',
        type: 'Incremental',
        sizeMb: 28.2,
        integrityStatus: 'Verificada',
        storageTarget: 'S3 Inmutable · eu-west-1',
      },
    ],
  };
}

let cachedDb: ErpDatabase | null = null;

export function getDb(): ErpDatabase {
  if (cachedDb) return cachedDb;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cachedDb = JSON.parse(raw) as ErpDatabase;
      return cachedDb;
    }
  } catch (err) {
    console.warn('No se pudo leer erp-store.json, usando datos iniciales:', err);
  }
  cachedDb = createSeedDatabase();
  saveDb();
  return cachedDb;
}

export function saveDb(): void {
  if (!cachedDb) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error guardando erp-store.json:', err);
  }
}

export function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordAudit(
  companyId: string,
  actor: string,
  role: RoleId,
  action: string,
  module: ModuleId,
  target: string
): void {
  const db = getDb();
  db.auditLogs.unshift({
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    companyId,
    actor,
    role,
    action,
    module,
    target,
    timestamp: nowTimestamp(),
  });
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200);
  }
}

export function emitOutboxEvent(
  companyId: string,
  eventName: string,
  entityRef: string,
  payloadData?: Record<string, unknown>
): void {
  const db = getDb();
  const company = db.companies.find((c) => c.id === companyId);
  const eventId = `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const entry = {
    id: eventId,
    companyId,
    eventName,
    entityRef,
    status: (company?.n8nWebhookUrl ? 'Procesando' : 'Enviado a n8n') as
      | 'Enviado a n8n'
      | 'Procesando'
      | 'En cola'
      | 'Error de envío',
    deliveryDetail: company?.n8nWebhookUrl ? `Enviando a ${company.n8nWebhookUrl}` : 'Registro local (sin webhook externo)',
    createdAt: nowTimestamp().slice(0, 16),
  };
  db.outboxEvents.unshift(entry);

  if (company?.n8nWebhookUrl) {
    const webhookUrl = company.n8nWebhookUrl;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (company.n8nSecret) {
      headers['x-n8n-secret'] = company.n8nSecret;
    }
    fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventId,
        eventName,
        companyId,
        companyName: company.name,
        entityRef,
        timestamp: nowTimestamp(),
        data: payloadData ?? {},
      }),
    })
      .then((res) => {
        entry.status = res.ok ? 'Enviado a n8n' : 'Error de envío';
        entry.deliveryDetail = `HTTP ${res.status} desde n8n`;
        saveDb();
      })
      .catch((err) => {
        entry.status = 'Error de envío';
        entry.deliveryDetail = err instanceof Error ? err.message : 'Fallo de red';
        saveDb();
      });
  }
}

export function addNotification(
  companyId: string,
  category: NotificationItem['category'],
  title: string,
  message: string,
  priority: 'Alta' | 'Normal' = 'Normal'
): void {
  const db = getDb();
  db.notifications.unshift({
    id: `not-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    companyId,
    category,
    title,
    message,
    priority,
    read: false,
    createdAt: nowTimestamp().slice(0, 16),
  });
}
