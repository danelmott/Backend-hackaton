/**
 * Catálogo oficial de productos Serfinanza.
 * ÚNICA fuente de verdad para IDs, tasas, requisitos y elegibilidad.
 * Datos extraídos de serfinanza_knowledge.md
 */

export const SMMLV_COP = 1_423_500;

export const OFFICIAL_PRODUCT_IDS = [
  'tarjeta_credito',
  'cdt',
  'actualizacion_datos',
  'app_serfinanza',
  'extractos',
];

export const OFFICIAL_PRODUCTS = {
  tarjeta_credito: {
    id: 'tarjeta_credito',
    name: 'Tarjeta de Crédito Serfinanza',
    document: 'Tarjeta de Crédito',
    variants: ['Clásica', 'Gold', 'Platinum'],
    minMonthlyIncome: 800_000,
    minEmploymentMonthsEmployee: 6,
    minEmploymentMonthsIndependent: 12,
    variantDetails: {
      Clásica: { maxQuota: 3_000_000, rateEA: 26.22, managementFee: 18_900 },
      Gold: { maxQuota: 10_000_000, rateEA: 24.5, managementFee: 28_500 },
      Platinum: { maxQuota: 30_000_000, rateEA: 22.0, managementFee: 38_000 },
    },
  },
  cdt: {
    id: 'cdt',
    name: 'CDT Serfinanza',
    document: 'CDT',
    minAmount: 500_000,
    retentionRate: 0.07,
    termsDays: [30, 60, 90, 120, 180, 360, 730, 1095, 1825],
    rateTable: [
      { termDays: 30, under10M: 7.5, from10Mto50M: 7.8, over50M: 8.1 },
      { termDays: 60, under10M: 8.0, from10Mto50M: 8.3, over50M: 8.6 },
      { termDays: 90, under10M: 8.5, from10Mto50M: 8.8, over50M: 9.1 },
      { termDays: 180, under10M: 9.2, from10Mto50M: 9.5, over50M: 9.8 },
      { termDays: 360, under10M: 10.0, from10Mto50M: 10.3, over50M: 10.6 },
      { termDays: 730, under10M: 10.5, from10Mto50M: 10.8, over50M: 11.1 },
      { termDays: 1095, under10M: 11.0, from10Mto50M: 11.3, over50M: 11.6 },
    ],
  },
  actualizacion_datos: {
    id: 'actualizacion_datos',
    name: 'Actualización de Datos',
    document: 'Actualización de Datos',
  },
  app_serfinanza: {
    id: 'app_serfinanza',
    name: 'App Serfinanza',
    document: 'Registro App',
  },
  extractos: {
    id: 'extractos',
    name: 'Extractos Bancarios',
    document: 'Extractos',
  },
};

export function isOfficialProductId(productId) {
  return OFFICIAL_PRODUCT_IDS.includes(productId);
}

export function getOfficialProduct(productId) {
  return OFFICIAL_PRODUCTS[productId] ?? null;
}

function getCdtRateEA(amount, termDays) {
  const cdt = OFFICIAL_PRODUCTS.cdt;
  const row = cdt.rateTable.find((r) => r.termDays === termDays)
    ?? cdt.rateTable.reduce((closest, r) =>
      Math.abs(r.termDays - termDays) < Math.abs(closest.termDays - termDays) ? r : closest
    );

  if (amount < 10_000_000) return row.under10M;
  if (amount <= 50_000_000) return row.from10Mto50M;
  return row.over50M;
}

/**
 * Simula CDT con tasas oficiales del knowledge base.
 * Fórmula alineada al ejemplo oficial (interés proporcional E.A. + retención 7%).
 */
export function simulateCdt({ amount, termDays }) {
  const cdt = OFFICIAL_PRODUCTS.cdt;

  if (amount < cdt.minAmount) {
    return {
      eligible: false,
      reason: `El monto mínimo oficial para un CDT es $${cdt.minAmount.toLocaleString('es-CO')}.`,
      minAmount: cdt.minAmount,
    };
  }

  const rateEA = getCdtRateEA(amount, termDays);
  const grossInterest = Math.round(amount * (rateEA / 100) * (termDays / 365));
  const retention = Math.round(grossInterest * cdt.retentionRate);
  const netInterest = grossInterest - retention;
  const totalAtMaturity = amount + netInterest;

  return {
    eligible: true,
    productId: 'cdt',
    amount,
    termDays,
    rateEA,
    grossInterest,
    retention,
    netInterest,
    totalAtMaturity,
    source: 'CDT',
  };
}

export function evaluateProductEligibility(productId, profile, variant = null) {
  const product = getOfficialProduct(productId);
  if (!product) {
    return { eligible: false, reason: 'Producto no oficial de Serfinanza.' };
  }

  if (productId === 'cdt') {
    const savings = profile?.currentSavings ?? 0;
    if (savings < product.minAmount) {
      return {
        eligible: false,
        productId,
        productName: product.name,
        reason: `Se requiere mínimo $${product.minAmount.toLocaleString('es-CO')} (ahorro declarado: $${savings.toLocaleString('es-CO')}).`,
        minAmount: product.minAmount,
      };
    }
    return { eligible: true, productId, productName: product.name, reason: 'Cumple monto mínimo oficial del CDT.' };
  }

  if (productId === 'tarjeta_credito') {
    const income = profile?.monthlyIncome ?? 0;
    if (income < product.minMonthlyIncome) {
      return {
        eligible: false,
        productId,
        productName: product.name,
        reason: `Ingresos mínimos oficiales: $${product.minMonthlyIncome.toLocaleString('es-CO')}.`,
        minMonthlyIncome: product.minMonthlyIncome,
      };
    }

    const employment = profile?.employmentType;
    if (employment === 'independiente') {
      return {
        eligible: true,
        productId,
        productName: product.name,
        variant,
        reason: 'Cumple ingresos mínimos. Requisito oficial: 12 meses de antigüedad como independiente.',
        note: 'Antigüedad laboral no verificada en chat; sujeta a evaluación crediticia.',
      };
    }

    return {
      eligible: true,
      productId,
      productName: product.name,
      variant,
      reason: 'Cumple ingresos mínimos oficiales para solicitar tarjeta de crédito.',
    };
  }

  return {
    eligible: true,
    productId,
    productName: product.name,
    reason: 'Producto disponible según documentación oficial Serfinanza.',
  };
}

export function computeFinancialHealthScore(profile) {
  if (!profile) return null;

  let score = 0;
  let factors = 0;

  if (profile.monthlyIncome && profile.fixedExpenses != null) {
    const ratio = (profile.monthlyIncome - profile.fixedExpenses) / profile.monthlyIncome;
    score += Math.min(100, Math.max(0, ratio * 100)) * 0.35;
    factors += 0.35;
  }

  if (profile.currentSavings && profile.monthlyIncome) {
    const monthsSaved = profile.currentSavings / profile.monthlyIncome;
    score += Math.min(100, monthsSaved * 25) * 0.25;
    factors += 0.25;
  }

  if (profile.objective) {
    score += 15;
    factors += 0.15;
  }

  const filled = [
    profile.objective,
    profile.monthlyIncome,
    profile.currentSavings,
    profile.fixedExpenses,
    profile.goalTimeframe,
    profile.employmentType,
    profile.productsOfInterest?.length,
  ].filter(Boolean).length;

  score += (filled / 7) * 100 * 0.25;
  factors += 0.25;

  if (factors === 0) return null;
  return Math.round(Math.min(100, score / factors * (factors > 0 ? 1 : 0)));
}

export function inferProfileInsights(profile) {
  if (!profile) return { inferredProfile: null, urgencyLevel: 'explorando' };

  let inferredProfile = 'moderado';
  if (profile.objective?.match(/invertir|cdt|rendimiento/i)) inferredProfile = 'conservador';
  if (profile.objective?.match(/comprar|crédito|tarjeta/i)) inferredProfile = 'moderado';

  const interestCount = profile.productsOfInterest?.length ?? 0;
  let urgencyLevel = 'explorando';
  if (interestCount >= 2 || (profile.currentSavings && profile.monthlyIncome)) urgencyLevel = 'evaluando';
  if (profile.objective && profile.currentSavings && profile.monthlyIncome) urgencyLevel = 'listo';

  return { inferredProfile, urgencyLevel };
}
