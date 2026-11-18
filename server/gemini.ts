import { GoogleGenAI, Type } from '@google/genai';
import type { Content, FunctionDeclaration } from '@google/genai';
import type { ErpProposalAction, RoleId } from '../src/types/erp.ts';
import { getDb } from './db.ts';
import { hasPermission } from './permissions.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno del servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildAuthorizedToolDeclarations(role: RoleId): FunctionDeclaration[] {
  const tools: FunctionDeclaration[] = [];

  if (hasPermission(role, 'dashboard', 'ver')) {
    tools.push({
      name: 'consultar_resumen_financiero',
      description: 'Obtiene indicadores financieros de la empresa activa: facturación total, cobrada, pendiente, vencida, gastos aprobados y saldo disponible.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          incluir_detalle_categorias: {
            type: Type.BOOLEAN,
            description: 'Si es true, incluye el desglose de gastos por categoría.',
          },
        },
      },
    });
  }

  if (hasPermission(role, 'facturacion', 'ver')) {
    tools.push({
      name: 'listar_facturas',
      description: 'Lista facturas y presupuestos de la empresa activa, con filtro opcional por estado o cliente.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          estado: {
            type: Type.STRING,
            description: 'Filtrar por estado: Cobrada, Pendiente, Vencida o Borrador.',
          },
          cliente: {
            type: Type.STRING,
            description: 'Texto parcial del nombre del cliente.',
          },
        },
      },
    });
  }

  if (hasPermission(role, 'clientes', 'ver') || hasPermission(role, 'proveedores', 'ver')) {
    tools.push({
      name: 'listar_clientes_y_proveedores',
      description: 'Consulta el directorio autorizado de clientes y proveedores de la empresa activa.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          tipo: {
            type: Type.STRING,
            description: 'clientes, proveedores o todos',
          },
        },
      },
    });
  }

  if (hasPermission(role, 'agenda', 'ver') || hasPermission(role, 'aprobaciones', 'ver')) {
    tools.push({
      name: 'listar_tareas_y_aprobaciones',
      description: 'Devuelve las tareas pendientes y solicitudes de aprobación humana de la empresa activa.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          solo_pendientes: {
            type: Type.BOOLEAN,
            description: 'Si es true, filtra únicamente elementos pendientes.',
          },
        },
      },
    });
  }

  if (hasPermission(role, 'facturacion', 'crear')) {
    tools.push({
      name: 'proponer_borrador_factura',
      description: 'Prepara una propuesta de borrador de factura o presupuesto para que el usuario la revise y confirme antes de guardarla en el ERP.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          tipo: {
            type: Type.STRING,
            description: 'Factura o Presupuesto',
          },
          cliente_nombre: {
            type: Type.STRING,
            description: 'Nombre exacto o aproximado del cliente.',
          },
          concepto: {
            type: Type.STRING,
            description: 'Descripción del servicio o producto.',
          },
          importe_base: {
            type: Type.NUMBER,
            description: 'Base imponible sin IVA en euros.',
          },
        },
        required: ['tipo', 'cliente_nombre', 'concepto', 'importe_base'],
      },
    });
  }

  if (hasPermission(role, 'agenda', 'crear')) {
    tools.push({
      name: 'proponer_tarea',
      description: 'Prepara una propuesta de nueva tarea en Agenda para confirmación del usuario.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          titulo: {
            type: Type.STRING,
            description: 'Título claro de la tarea.',
          },
          fecha_limite: {
            type: Type.STRING,
            description: 'Fecha en formato YYYY-MM-DD.',
          },
          prioridad: {
            type: Type.STRING,
            description: 'Alta, Media o Baja.',
          },
          categoria: {
            type: Type.STRING,
            description: 'Cobro, Contrato, Fiscal u Operación.',
          },
        },
        required: ['titulo', 'fecha_limite', 'prioridad'],
      },
    });
  }

  return tools;
}

function executeErpTool(
  toolName: string,
  args: Record<string, unknown>,
  companyId: string,
  role: RoleId
): { result: unknown; proposal?: ErpProposalAction } {
  const db = getDb();
  const company = db.companies.find((c) => c.id === companyId);

  switch (toolName) {
    case 'consultar_resumen_financiero': {
      if (!hasPermission(role, 'dashboard', 'ver')) {
        return { result: { error: 'Permiso denegado para consultar resumen financiero.' } };
      }
      const invoices = db.invoices.filter((i) => i.companyId === companyId && i.type === 'Factura');
      const expenses = db.expenses.filter((e) => e.companyId === companyId);
      const totalFacturado = invoices.reduce((s, i) => s + i.total, 0);
      const cobrado = invoices.filter((i) => i.status === 'Cobrada').reduce((s, i) => s + i.total, 0);
      const pendiente = invoices.filter((i) => i.status === 'Pendiente').reduce((s, i) => s + i.total, 0);
      const vencido = invoices.filter((i) => i.status === 'Vencida').reduce((s, i) => s + i.total, 0);
      const totalGastos = expenses.filter((e) => e.status !== 'Rechazado').reduce((s, e) => s + e.total, 0);

      const byCategory: Record<string, number> = {};
      if (args.incluir_detalle_categorias) {
        for (const e of expenses) {
          byCategory[e.category] = (byCategory[e.category] ?? 0) + e.total;
        }
      }

      return {
        result: {
          empresa: company?.name,
          saldoBancario: company?.bankBalance ?? 0,
          totalFacturado,
          cobrado,
          pendienteCobro: pendiente,
          vencido,
          totalGastos,
          beneficioEstimado: totalFacturado - totalGastos,
          gastosPorCategoria: args.incluir_detalle_categorias ? byCategory : undefined,
        },
      };
    }

    case 'listar_facturas': {
      if (!hasPermission(role, 'facturacion', 'ver')) {
        return { result: { error: 'Permiso denegado para consultar facturación.' } };
      }
      let list = db.invoices.filter((i) => i.companyId === companyId);
      if (typeof args.estado === 'string' && args.estado.trim()) {
        const st = args.estado.trim().toLowerCase();
        list = list.filter((i) => i.status.toLowerCase() === st);
      }
      if (typeof args.cliente === 'string' && args.cliente.trim()) {
        const q = args.cliente.trim().toLowerCase();
        list = list.filter((i) => i.customerName.toLowerCase().includes(q));
      }
      return {
        result: list.map((i) => ({
          numero: i.number,
          tipo: i.type,
          cliente: i.customerName,
          emision: i.issueDate,
          vencimiento: i.dueDate,
          estado: i.status,
          total: i.total,
        })),
      };
    }

    case 'listar_clientes_y_proveedores': {
      const tipo = typeof args.tipo === 'string' ? args.tipo.toLowerCase() : 'todos';
      const customers =
        (tipo === 'clientes' || tipo === 'todos') && hasPermission(role, 'clientes', 'ver')
          ? db.customers
              .filter((c) => c.companyId === companyId)
              .map((c) => ({ nombre: c.name, nif: c.nif, ciudad: c.city, estado: c.status, facturado: c.totalBilled }))
          : [];
      const suppliers =
        (tipo === 'proveedores' || tipo === 'todos') && hasPermission(role, 'proveedores', 'ver')
          ? db.suppliers
              .filter((s) => s.companyId === companyId)
              .map((s) => ({ nombre: s.name, nif: s.nif, categoria: s.category, estado: s.status, comprado: s.totalPurchased }))
          : [];
      return {
        result: {
          clientes: hasPermission(role, 'clientes', 'ver') ? customers : 'Sin permiso para ver clientes',
          proveedores: hasPermission(role, 'proveedores', 'ver') ? suppliers : 'Sin permiso para ver proveedores',
        },
      };
    }

    case 'listar_tareas_y_aprobaciones': {
      const onlyPending = args.solo_pendientes !== false;
      const tasks = hasPermission(role, 'agenda', 'ver')
        ? db.tasks
            .filter((t) => t.companyId === companyId && (!onlyPending || !t.completed))
            .map((t) => ({ titulo: t.title, fecha: t.dueDate, prioridad: t.priority, responsable: t.assignee, completada: t.completed }))
        : [];
      const approvals = hasPermission(role, 'aprobaciones', 'ver')
        ? db.approvals
            .filter((a) => a.companyId === companyId && (!onlyPending || a.status === 'Pendiente'))
            .map((a) => ({ titulo: a.title, tipo: a.type, importe: a.amount, estado: a.status }))
        : [];
      return { result: { tareas: tasks, aprobaciones: approvals } };
    }

    case 'proponer_borrador_factura': {
      if (!hasPermission(role, 'facturacion', 'crear')) {
        return { result: { error: 'Tu rol actual no tiene permisos para crear facturas o presupuestos.' } };
      }
      const customerQuery = String(args.cliente_nombre ?? '').toLowerCase();
      const matchedCustomer =
        db.customers.find((c) => c.companyId === companyId && c.name.toLowerCase().includes(customerQuery)) ??
        db.customers.find((c) => c.companyId === companyId);

      const base = Number(args.importe_base ?? 0);
      const vat = Math.round(base * 0.21 * 100) / 100;
      const total = Math.round((base + vat) * 100) / 100;
      const docType = args.tipo === 'Presupuesto' ? 'Presupuesto' : 'Factura';

      const proposal: ErpProposalAction = {
        proposalId: `prop-${Date.now()}`,
        actionType: 'create_invoice_draft',
        title: `Crear borrador de ${docType} para ${matchedCustomer?.name ?? String(args.cliente_nombre)}`,
        summary: `${String(args.concepto)} · Base ${base.toFixed(2)} € + 21% IVA (${vat.toFixed(2)} €)`,
        amount: total,
        data: {
          type: docType,
          customerId: matchedCustomer?.id ?? '',
          customerName: matchedCustomer?.name ?? String(args.cliente_nombre),
          customerNif: matchedCustomer?.nif ?? 'Pendiente NIF',
          description: String(args.concepto),
          unitPrice: base,
        },
      };
      return {
        result: {
          estado: 'PROPUESTA_PENDIENTE_CONFIRMACION_HUMANA',
          mensaje: 'Se ha generado el borrador para confirmación explícita del usuario en la interfaz.',
          totalConIva: total,
        },
        proposal,
      };
    }

    case 'proponer_tarea': {
      if (!hasPermission(role, 'agenda', 'crear')) {
        return { result: { error: 'Tu rol actual no tiene permisos para crear tareas.' } };
      }
      const proposal: ErpProposalAction = {
        proposalId: `prop-${Date.now()}`,
        actionType: 'create_task',
        title: `Añadir tarea: ${String(args.titulo)}`,
        summary: `Vencimiento: ${String(args.fecha_limite)} · Prioridad: ${String(args.prioridad ?? 'Media')}`,
        data: {
          title: String(args.titulo),
          dueDate: String(args.fecha_limite),
          priority: args.prioridad === 'Alta' || args.prioridad === 'Baja' ? args.prioridad : 'Media',
          category:
            args.categoria === 'Cobro' || args.categoria === 'Contrato' || args.categoria === 'Fiscal'
              ? args.categoria
              : 'Operación',
        },
      };
      return {
        result: {
          estado: 'PROPUESTA_PENDIENTE_CONFIRMACION_HUMANA',
          mensaje: 'La tarea está lista para que el usuario la confirme.',
        },
        proposal,
      };
    }

    default:
      return { result: { error: `Herramienta desconocida: ${toolName}` } };
  }
}

export async function runErpAssistantChat(params: {
  companyId: string;
  role: RoleId;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ reply: string; toolsUsed: string[]; proposal?: ErpProposalAction }> {
  const ai = getAiClient();
  const db = getDb();
  const company = db.companies.find((c) => c.id === params.companyId);
  const authorizedTools = buildAuthorizedToolDeclarations(params.role);

  const systemInstruction = `Eres el Asistente Empresarial de Núcleo ERP para la empresa "${company?.name ?? params.companyId}" (NIF ${company?.nif ?? ''}).
El usuario actual tiene el rol "${params.role}".
Principios obligatorios:
1. Solo puedes responder usando datos reales obtenidos mediante las herramientas autorizadas del ERP. Nunca inventes cifras, clientes ni facturas.
2. Si el usuario solicita información o acciones para las que su rol no dispone de herramienta autorizada, indícale claramente que su perfil actual no tiene permiso para esa operación.
3. Toda acción con efecto económico o creación de registros (borradores de facturas o tareas) genera una propuesta que requiere confirmación humana explícita; indícaselo al usuario.
4. Responde siempre en español claro, conciso, estructurado y profesional. Formatea importes en euros (ej. 6.534,00 €).`;

  const contents: Content[] = [
    ...params.history.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: params.message }] },
  ];

  const toolsUsed: string[] = [];
  let pendingProposal: ErpProposalAction | undefined;

  let response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents,
    config: {
      systemInstruction,
      tools: authorizedTools.length > 0 ? [{ functionDeclarations: authorizedTools }] : undefined,
    },
  });

  // Handle up to 3 rounds of tool calls
  for (let step = 0; step < 3; step++) {
    const calls = response.functionCalls;
    if (!calls || calls.length === 0) break;

    const modelContent = response.candidates?.[0]?.content;
    if (!modelContent) break;

    contents.push(modelContent);

    const toolResponseParts = calls.map((call) => {
      const name = call.name ?? 'unknown';
      toolsUsed.push(name);
      const exec = executeErpTool(
        name,
        (call.args ?? {}) as Record<string, unknown>,
        params.companyId,
        params.role
      );
      if (exec.proposal) {
        pendingProposal = exec.proposal;
      }
      return {
        functionResponse: {
          id: call.id,
          name,
          response: { output: exec.result },
        },
      };
    });

    contents.push({
      role: 'user',
      parts: toolResponseParts,
    });

    response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        tools: authorizedTools.length > 0 ? [{ functionDeclarations: authorizedTools }] : undefined,
      },
    });
  }

  return {
    reply: response.text ?? 'No se pudo generar una respuesta en este momento.',
    toolsUsed: Array.from(new Set(toolsUsed)),
    proposal: pendingProposal,
  };
}

export async function generateExecutiveBriefing(companyId: string, role: RoleId): Promise<{
  summary: string;
  highlights: Array<{ title: string; detail: string; level: 'info' | 'warning' | 'critical' }>;
}> {
  if (!hasPermission(role, 'dashboard', 'ver')) {
    throw new Error('Tu rol no tiene acceso al resumen ejecutivo.');
  }
  const ai = getAiClient();
  const db = getDb();
  const company = db.companies.find((c) => c.id === companyId);
  const invoices = db.invoices.filter((i) => i.companyId === companyId);
  const expenses = db.expenses.filter((e) => e.companyId === companyId);
  const tasks = db.tasks.filter((t) => t.companyId === companyId && !t.completed);
  const approvals = db.approvals.filter((a) => a.companyId === companyId && a.status === 'Pendiente');

  const snapshot = {
    empresa: company?.name,
    saldoBancario: company?.bankBalance,
    facturas: invoices.map((i) => ({
      numero: i.number,
      tipo: i.type,
      cliente: i.customerName,
      estado: i.status,
      vencimiento: i.dueDate,
      total: i.total,
    })),
    gastos: expenses.map((e) => ({
      proveedor: e.supplierName,
      concepto: e.concept,
      categoria: e.category,
      estado: e.status,
      total: e.total,
    })),
    tareasPendientes: tasks.map((t) => ({ titulo: t.title, fecha: t.dueDate, prioridad: t.priority })),
    aprobacionesPendientes: approvals.map((a) => ({ titulo: a.title, importe: a.amount })),
  };

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Analiza la situación operativa actual de esta empresa y redacta un resumen ejecutivo breve y 3 recomendaciones accionables prioritarias:\n${JSON.stringify(snapshot)}`,
    config: {
      systemInstruction: 'Eres un analista financiero y operativo de ERP. Sé directo, claro y basa todas las cifras exclusivamente en el JSON proporcionado.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'Resumen ejecutivo de 2-3 frases en español claro.',
          },
          highlights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                detail: { type: Type.STRING },
                level: { type: Type.STRING, description: 'info, warning o critical' },
              },
              required: ['title', 'detail', 'level'],
            },
          },
        },
        required: ['summary', 'highlights'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    summary?: string;
    highlights?: Array<{ title: string; detail: string; level: 'info' | 'warning' | 'critical' }>;
  };

  return {
    summary: parsed.summary ?? 'Análisis completado.',
    highlights: parsed.highlights ?? [],
  };
}

export async function extractExpenseWithGemini(params: {
  rawText?: string;
  fileBase64?: string;
  mimeType?: string;
}): Promise<{
  supplierName: string;
  supplierNif: string;
  concept: string;
  category: 'Suministros' | 'Software' | 'Servicios profesionales' | 'Viajes' | 'Material' | 'Otros';
  date: string;
  subtotal: number;
  vatAmount: number;
  total: number;
}> {
  const ai = getAiClient();

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (params.fileBase64 && params.mimeType) {
    parts.push({
      inlineData: {
        mimeType: params.mimeType,
        data: params.fileBase64,
      },
    });
  }

  parts.push({
    text: `Extrae los datos estructurados de esta factura o ticket de gasto para preparar un borrador contable. ${
      params.rawText ? `Contenido:\n${params.rawText}` : ''
    }`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      systemInstruction:
        'Extrae datos fiscales españoles con precisión. Si falta un dato numérico, calcúlalo de forma coherente o pon 0. Categoría debe ser una de: Suministros, Software, Servicios profesionales, Viajes, Material, Otros. Fecha en YYYY-MM-DD.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          supplierName: { type: Type.STRING },
          supplierNif: { type: Type.STRING },
          concept: { type: Type.STRING },
          category: { type: Type.STRING },
          date: { type: Type.STRING },
          subtotal: { type: Type.NUMBER },
          vatAmount: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
        },
        required: ['supplierName', 'supplierNif', 'concept', 'category', 'date', 'subtotal', 'vatAmount', 'total'],
      },
    },
  });

  const data = JSON.parse((response.text ?? '{}').trim()) as {
    supplierName?: string;
    supplierNif?: string;
    concept?: string;
    category?: string;
    date?: string;
    subtotal?: number;
    vatAmount?: number;
    total?: number;
  };

  const allowedCategories = ['Suministros', 'Software', 'Servicios profesionales', 'Viajes', 'Material', 'Otros'] as const;
  const matchedCat = allowedCategories.find((c) => c === data.category) ?? 'Otros';

  return {
    supplierName: data.supplierName || 'Proveedor sin identificar',
    supplierNif: data.supplierNif || 'Pendiente NIF',
    concept: data.concept || 'Gasto extraído de documento',
    category: matchedCat,
    date: data.date || new Date().toISOString().slice(0, 10),
    subtotal: Number(data.subtotal ?? 0),
    vatAmount: Number(data.vatAmount ?? 0),
    total: Number(data.total ?? 0),
  };
}
