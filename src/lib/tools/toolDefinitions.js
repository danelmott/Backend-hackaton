import { OFFICIAL_PRODUCT_IDS, OFFICIAL_PRODUCTS } from '../productCatalog.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'save_user_profile',
    description:
      'Guarda datos del usuario durante Fase 1. Llama cada vez que comparta un dato (ingreso, edad, deudas, antigüedad, producto de interés, etc.). Solo envía campos nuevos o actualizados.',
    input_schema: {
      type: 'object',
      properties: {
        employmentType: {
          type: 'string',
          enum: ['empleado', 'independiente', 'pensionado'],
          description: 'Tipo de ingreso',
        },
        monthlyIncome: { type: 'number', description: 'Ingreso neto mensual en COP' },
        employmentSeniority: {
          type: 'string',
          description: 'Antigüedad laboral o del negocio, ej: "8 meses", "2 años"',
        },
        monthlyDebtPayments: {
          type: 'number',
          description: 'Total cuotas mensuales de deudas en COP. Usar 0 si no tiene deudas.',
        },
        currentSavings: { type: 'number', description: 'Ahorros actuales / disponible cuota inicial en COP' },
        age: { type: 'number', description: 'Edad del usuario en años' },
        targetProduct: {
          type: 'string',
          description: 'Producto de interés: CDT, tarjeta, crédito vehículo, libre inversión, hipotecario, etc.',
        },
        objective: { type: 'string', description: 'Objetivo financiero general' },
        fixedExpenses: { type: 'number', description: 'Gastos fijos mensuales en COP' },
        goalTimeframe: { type: 'string', description: 'Plazo: corto, mediano, largo, o meses' },
        productsOfInterest: {
          type: 'array',
          items: { type: 'string', enum: OFFICIAL_PRODUCT_IDS },
          description: 'IDs oficiales Serfinanza si aplica',
        },
      },
    },
  },
  {
    name: 'log_product_interest',
    description:
      'Registra interés en producto oficial. SOLO si Fase 1 está COMPLETA (7/7 en contexto). Si no, solo pregunta el dato faltante.',
    input_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', enum: OFFICIAL_PRODUCT_IDS },
        variant: {
          type: 'string',
          enum: ['Clásica', 'Gold', 'Platinum'],
          description: 'Solo para tarjeta_credito',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'simulate_cdt',
    description:
      'Simula CDT con tasas oficiales. SOLO si Fase 1 COMPLETA. Si no, pregunta el dato faltante.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Monto en COP. Mínimo $500.000' },
        termDays: {
          type: 'number',
          enum: [30, 60, 90, 120, 180, 360, 730, 1095, 1825],
          description: 'Plazo en días',
        },
      },
    },
  },
  {
    name: 'evaluate_product_fit',
    description:
      'Evalúa elegibilidad referencial de producto oficial. SOLO si Fase 1 COMPLETA. Usar en Fase 4 antes de recomendar.',
    input_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', enum: OFFICIAL_PRODUCT_IDS },
        variant: { type: 'string', enum: ['Clásica', 'Gold', 'Platinum'] },
      },
      required: ['productId'],
    },
  },
];

export const OFFICIAL_PRODUCTS_PROMPT = OFFICIAL_PRODUCT_IDS.map((id) => {
  const p = OFFICIAL_PRODUCTS[id];
  return `- ${id}: ${p.name} [documento: ${p.document}]`;
}).join('\n');
