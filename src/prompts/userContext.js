import { PHASE_1_FIELD_KEYS } from '../profile/profile.service.js';

const PHASE_1_LABELS = {
  employmentType: 'Tipo de ingreso (empleado/independiente/pensionado)',
  monthlyIncome: 'Ingreso neto mensual',
  employmentSeniority: 'Antigüedad laboral o del negocio',
  monthlyDebtPayments: 'Cuotas mensuales de deudas',
  currentSavings: 'Ahorros / disponible cuota inicial',
  age: 'Edad',
  targetProduct: 'Producto de interés',
};

const EXTRA_FIELDS = [
  { key: 'objective', label: 'Objetivo financiero' },
  { key: 'fixedExpenses', label: 'Gastos fijos mensuales' },
  { key: 'goalTimeframe', label: 'Plazo de la meta' },
  { key: 'productsOfInterest', label: 'Productos oficiales de interés' },
];

function formatValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) return value.length ? value.join(', ') : null;
  if (typeof value === 'number') {
    return `$${value.toLocaleString('es-CO')} COP`;
  }
  return String(value);
}

function formatFieldValue(key, value) {
  if (value === null || value === undefined || value === '') return null;
  if (key === 'age') return `${value} años`;
  if (key === 'monthlyDebtPayments' && value === 0) return '$0 COP (sin deudas)';
  if (typeof value === 'number' && key !== 'age') {
    return `$${value.toLocaleString('es-CO')} COP`;
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : null;
  return String(value);
}

function getMissingPhase1(profile) {
  if (!profile) return [...PHASE_1_FIELD_KEYS];
  return PHASE_1_FIELD_KEYS.filter((key) => {
    const val = profile[key];
    if (key === 'monthlyDebtPayments') {
      return val === null || val === undefined;
    }
    return val === null || val === undefined || val === '';
  });
}

/**
 * Formatea el perfil financiero del usuario para inyectarlo en el system prompt.
 */
export function formatUserContext(profile) {
  const phase1Complete = profile?.phase1Complete ?? false;
  const missingPhase1 = getMissingPhase1(profile);

  if (!profile) {
    return `=== CONTEXTO DEL USUARIO ===
FASE 1 (captura obligatoria): INCOMPLETA — 0/7 campos
Siguiente dato a pedir: ${PHASE_1_LABELS.employmentType}
NO recomiendes, NO calcules, NO uses simulate_cdt/evaluate_product_fit/log_product_interest. Solo pregunta el dato faltante.`;
  }

  const phase1Known = [];
  for (const key of PHASE_1_FIELD_KEYS) {
    const formatted = formatFieldValue(key, profile[key]);
    if (formatted) phase1Known.push(`- ${PHASE_1_LABELS[key]}: ${formatted}`);
  }

  const extraKnown = [];
  for (const field of EXTRA_FIELDS) {
    const formatted = formatValue(profile[field.key]);
    if (formatted) extraKnown.push(`- ${field.label}: ${formatted}`);
  }

  const insights = [];
  if (profile.inferredProfile) insights.push(`- Perfil inferido: ${profile.inferredProfile}`);
  if (profile.urgencyLevel) insights.push(`- Urgencia: ${profile.urgencyLevel}`);
  if (profile.financialHealthScore != null) {
    insights.push(`- Score salud financiera: ${profile.financialHealthScore}`);
  }

  const phaseBlock = phase1Complete
    ? `FASE 1: COMPLETA (7/7) — Puedes pasar a Fase 2 (validación), Fase 3 (cálculos) y Fase 4 (recomendación con tools).`
    : `FASE 1: INCOMPLETA (${phase1Known.length}/7)
FALTA PEDIR (una pregunta por mensaje): ${missingPhase1.map((k) => PHASE_1_LABELS[k]).join(' → ')}
Siguiente dato prioritario: ${PHASE_1_LABELS[missingPhase1[0]]}
PROHIBIDO: recomendar, calcular endeudamiento, usar simulate_cdt, evaluate_product_fit, log_product_interest.`;

  return `=== CONTEXTO DEL USUARIO ===
${phaseBlock}

Datos Fase 1 capturados:
${phase1Known.length ? phase1Known.join('\n') : '- Ninguno todavía'}

${extraKnown.length ? `Otros datos:\n${extraKnown.join('\n')}` : ''}

${insights.length ? `Insights:\n${insights.join('\n')}` : ''}`.trim();
}
