import { OFFICIAL_PRODUCTS } from '../lib/productCatalog.js';
import { PHASE_1_FIELD_KEYS, isPhase1Complete, profileToContext } from './profile.service.js';

export const PHASE_1_QUESTIONS = {
  employmentType: {
    field: 'employmentType',
    title: '¿Cuál es tu tipo de ingreso?',
    type: 'select',
    options: [
      { value: 'empleado', label: 'Empleado' },
      { value: 'independiente', label: 'Independiente' },
      { value: 'pensionado', label: 'Pensionado' },
    ],
  },
  monthlyIncome: {
    field: 'monthlyIncome',
    title: '¿Cuál es tu ingreso neto mensual?',
    subtitle: 'En pesos colombianos (COP), después de descuentos.',
    type: 'currency',
    placeholder: 'Ej: 3.000.000',
  },
  employmentSeniority: {
    field: 'employmentSeniority',
    title: '¿Cuánta antigüedad tienes en tu trabajo o negocio?',
    type: 'text',
    placeholder: 'Ej: 2 años, 8 meses',
  },
  monthlyDebtPayments: {
    field: 'monthlyDebtPayments',
    title: '¿Cuánto pagas al mes en otras deudas?',
    subtitle: 'Suma de cuotas de créditos, tarjetas, etc. Escribe 0 si no tienes.',
    type: 'currency',
    placeholder: 'Ej: 500.000 o 0',
    allowZero: true,
  },
  currentSavings: {
    field: 'currentSavings',
    title: '¿Cuánto tienes ahorrado actualmente?',
    subtitle: 'Disponible para cuota inicial o inversión.',
    type: 'currency',
    placeholder: 'Ej: 5.000.000',
  },
  age: {
    field: 'age',
    title: '¿Cuántos años tienes?',
    type: 'number',
    placeholder: 'Ej: 32',
    min: 18,
    max: 100,
  },
  targetProduct: {
    field: 'targetProduct',
    title: '¿Qué producto te interesa?',
    type: 'select',
    options: [
      { value: 'cdt', label: OFFICIAL_PRODUCTS.cdt.name },
      { value: 'tarjeta_credito', label: OFFICIAL_PRODUCTS.tarjeta_credito.name },
      { value: 'credito_vehiculo', label: 'Crédito de vehículo' },
      { value: 'credito_hipotecario', label: 'Crédito hipotecario' },
      { value: 'credito_libre_inversion', label: 'Crédito libre inversión' },
    ],
  },
};

function isFieldMissing(profile, key) {
  const val = profile?.[key];
  if (key === 'monthlyDebtPayments') {
    return val === null || val === undefined;
  }
  return val === null || val === undefined || val === '';
}

export function getMissingPhase1Fields(profile) {
  if (!profile) return [...PHASE_1_FIELD_KEYS];
  return PHASE_1_FIELD_KEYS.filter((key) => isFieldMissing(profile, key));
}

export function buildStructuredQuestion(fieldKey, profile = null) {
  const definition = PHASE_1_QUESTIONS[fieldKey];
  if (!definition) return null;

  const missingFields = getMissingPhase1Fields(profile);
  const currentIndex = PHASE_1_FIELD_KEYS.indexOf(fieldKey);
  const missingIndex = missingFields.indexOf(fieldKey);

  return {
    field: fieldKey,
    title: definition.title,
    subtitle: definition.subtitle ?? null,
    type: definition.type,
    options: definition.options ?? null,
    placeholder: definition.placeholder ?? null,
    min: definition.min ?? null,
    max: definition.max ?? null,
    allowZero: definition.allowZero ?? false,
    step: currentIndex + 1,
    totalSteps: PHASE_1_FIELD_KEYS.length,
    missingCount: missingFields.length,
    missingIndex: missingIndex >= 0 ? missingIndex + 1 : null,
    currentValue: profile?.[fieldKey] ?? null,
  };
}

export function getNextStructuredQuestion(profile) {
  const missing = getMissingPhase1Fields(profile);
  if (missing.length === 0) return null;
  return buildStructuredQuestion(missing[0], profile);
}

export function getQuestionsState(profile) {
  const missingFields = getMissingPhase1Fields(profile);
  const phase1Complete = isPhase1Complete(profile);

  return {
    phase1Complete,
    missingFields,
    totalSteps: PHASE_1_FIELD_KEYS.length,
    completedSteps: PHASE_1_FIELD_KEYS.length - missingFields.length,
    questions: PHASE_1_FIELD_KEYS.map((key) => buildStructuredQuestion(key, profile)),
    activeQuestion: phase1Complete ? null : buildStructuredQuestion(missingFields[0], profile),
  };
}

export function formatAnswerForChat(fieldKey, value) {
  const definition = PHASE_1_QUESTIONS[fieldKey];
  if (!definition) return String(value);

  if (definition.type === 'select') {
    const option = definition.options?.find((o) => o.value === value);
    const label = option?.label ?? value;
    switch (fieldKey) {
      case 'employmentType':
        return `Soy ${label.toLowerCase()}.`;
      case 'targetProduct':
        return `Me interesa ${label}.`;
      default:
        return label;
    }
  }

  if (definition.type === 'currency') {
    const amount = Number(value);
    const formatted = `$${amount.toLocaleString('es-CO')} COP`;
    switch (fieldKey) {
      case 'monthlyIncome':
        return `Mi ingreso neto mensual es ${formatted}.`;
      case 'monthlyDebtPayments':
        return amount === 0
          ? 'No tengo deudas mensuales (0 COP).'
          : `Pago ${formatted} al mes en deudas.`;
      case 'currentSavings':
        return `Tengo ${formatted} ahorrados.`;
      default:
        return formatted;
    }
  }

  if (fieldKey === 'age') {
    return `Tengo ${value} años.`;
  }

  if (fieldKey === 'employmentSeniority') {
    return `Mi antigüedad laboral es ${value}.`;
  }

  return String(value);
}

export function normalizeFieldValue(fieldKey, rawValue) {
  const definition = PHASE_1_QUESTIONS[fieldKey];
  if (!definition || rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  if (definition.type === 'currency' || definition.type === 'number') {
    const num = Number(String(rawValue).replace(/[^\d]/g, ''));
    if (Number.isNaN(num)) return null;
    if (definition.type === 'number' && definition.min != null && num < definition.min) return null;
    if (definition.type === 'number' && definition.max != null && num > definition.max) return null;
    return num;
  }

  if (definition.type === 'select') {
    const match = definition.options?.find(
      (o) => o.value === rawValue || o.label.toLowerCase() === String(rawValue).toLowerCase()
    );
    return match?.value ?? String(rawValue).trim();
  }

  return String(rawValue).trim();
}

export function getProfileWithContext(profile) {
  return profileToContext(profile);
}
