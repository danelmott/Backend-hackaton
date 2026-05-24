import { OFFICIAL_PRODUCT_IDS, OFFICIAL_PRODUCTS } from '../productCatalog.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'save_user_profile',
    description:
      'Guarda o actualiza datos financieros del usuario mencionados en la conversación. Llama esta tool cuando el usuario comparta ingresos, ahorro, gastos, objetivo, plazo o perfil laboral. Solo envía campos nuevos o actualizados.',
    input_schema: {
      type: 'object',
      properties: {
        objective: { type: 'string', description: 'Objetivo: ahorrar, invertir, pagar deuda, comprar, emergencia, etc.' },
        monthlyIncome: { type: 'number', description: 'Ingresos mensuales en COP' },
        currentSavings: { type: 'number', description: 'Ahorro disponible en COP' },
        fixedExpenses: { type: 'number', description: 'Gastos fijos mensuales en COP' },
        goalTimeframe: { type: 'string', description: 'Plazo: corto, mediano, largo, o meses específicos' },
        employmentType: { type: 'string', enum: ['empleado', 'independiente'] },
        productsOfInterest: {
          type: 'array',
          items: { type: 'string', enum: OFFICIAL_PRODUCT_IDS },
          description: 'IDs oficiales de productos Serfinanza de interés',
        },
      },
    },
  },
  {
    name: 'log_product_interest',
    description:
      'Registra interés del usuario en un producto oficial Serfinanza cuando pregunte o muestre intención sobre él. Solo productos de la base de conocimiento oficial.',
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
      'Simula un CDT Serfinanza usando las tasas oficiales del knowledge base. Usar cuando el usuario quiera calcular rendimiento de inversión en CDT.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Monto a invertir en COP. Mínimo oficial $500.000' },
        termDays: {
          type: 'number',
          enum: [30, 60, 90, 120, 180, 360, 730, 1095, 1825],
          description: 'Plazo en días según tabla oficial',
        },
      },
    },
  },
  {
    name: 'evaluate_product_fit',
    description:
      'Evalúa si el usuario cumple requisitos oficiales de un producto Serfinanza según su perfil y la base de conocimiento. Usar antes de recomendar un producto específico.',
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
