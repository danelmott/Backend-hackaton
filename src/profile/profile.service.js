import { prisma } from '../lib/prismaClient.js';
import {
  computeFinancialHealthScore,
  inferProfileInsights,
  evaluateProductEligibility,
  simulateCdt,
  isOfficialProductId,
  getOfficialProduct,
} from '../lib/productCatalog.js';

/** Campos obligatorios Fase 1 del flujo de asesoría */
export const PHASE_1_FIELD_KEYS = [
  'employmentType',
  'monthlyIncome',
  'employmentSeniority',
  'monthlyDebtPayments',
  'currentSavings',
  'age',
  'targetProduct',
];

export function isPhase1Complete(profile) {
  if (!profile) return false;
  return PHASE_1_FIELD_KEYS.every((key) => {
    const val = profile[key];
    if (key === 'monthlyDebtPayments') {
      return val !== null && val !== undefined;
    }
    return val !== null && val !== undefined && val !== '';
  });
}

function cleanProfileData(data, existing = null) {
  const cleaned = {};
  if (data.objective !== undefined) cleaned.objective = data.objective;
  if (data.monthlyIncome !== undefined) cleaned.monthlyIncome = Math.round(Number(data.monthlyIncome));
  if (data.currentSavings !== undefined) cleaned.currentSavings = Math.round(Number(data.currentSavings));
  if (data.fixedExpenses !== undefined) cleaned.fixedExpenses = Math.round(Number(data.fixedExpenses));
  if (data.monthlyDebtPayments !== undefined) {
    cleaned.monthlyDebtPayments = Math.round(Number(data.monthlyDebtPayments));
  }
  if (data.age !== undefined) cleaned.age = Math.round(Number(data.age));
  if (data.goalTimeframe !== undefined) cleaned.goalTimeframe = data.goalTimeframe;
  if (data.employmentType !== undefined) cleaned.employmentType = data.employmentType;
  if (data.employmentSeniority !== undefined) cleaned.employmentSeniority = data.employmentSeniority;
  if (data.targetProduct !== undefined) cleaned.targetProduct = data.targetProduct;
  if (data.productsOfInterest !== undefined) {
    const incoming = Array.isArray(data.productsOfInterest)
      ? data.productsOfInterest.filter(isOfficialProductId)
      : [];
    const existingList = existing?.productsOfInterest ?? [];
    cleaned.productsOfInterest = [...new Set([...existingList, ...incoming])];
  }
  return cleaned;
}

export async function getUserProfile(userId) {
  return prisma.userProfile.findUnique({ where: { userId } });
}

export async function saveUserProfile(userId, data) {
  const existing = await getUserProfile(userId);
  const cleaned = cleanProfileData(data, existing);
  if (Object.keys(cleaned).length === 0) return existing;

  const merged = { ...existing, ...cleaned };

  const insights = inferProfileInsights(merged);
  const financialHealthScore = computeFinancialHealthScore(merged);

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...cleaned,
      ...insights,
      financialHealthScore,
    },
    update: {
      ...cleaned,
      ...insights,
      financialHealthScore,
    },
  });

  return profile;
}

export async function logProductInterest(userId, productId, variant = null) {
  if (!isOfficialProductId(productId)) {
    throw { code: 'INVALID_PRODUCT', message: 'Producto no oficial de Serfinanza.' };
  }

  const profile = await getUserProfile(userId);
  if (!isPhase1Complete(profile)) {
    throw {
      code: 'PHASE_1_INCOMPLETE',
      message: 'Fase 1 incompleta. Captura todos los datos obligatorios antes de registrar interés.',
    };
  }

  const product = getOfficialProduct(productId);
  const safeVariant = variant && product?.variants?.includes(variant) ? variant : null;

  const interest = await prisma.productInterest.upsert({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    create: {
      userId,
      productId,
      variant: safeVariant,
      count: 1,
    },
    update: {
      count: { increment: 1 },
      lastAt: new Date(),
      ...(safeVariant ? { variant: safeVariant } : {}),
    },
  });

  const currentProducts = profile?.productsOfInterest ?? [];
  if (!currentProducts.includes(productId)) {
    await saveUserProfile(userId, {
      productsOfInterest: [...currentProducts, productId],
    });
  }

  return interest;
}

export async function runSimulateCdt(userId, { amount, termDays }) {
  const profile = await getUserProfile(userId);
  if (!isPhase1Complete(profile)) {
    return {
      success: false,
      message: 'Fase 1 incompleta. Captura todos los datos obligatorios antes de simular.',
    };
  }

  const savings = profile?.currentSavings;
  const investAmount = amount ?? savings;

  if (!investAmount) {
    return {
      success: false,
      message: 'Se requiere monto para simular. Pregunta al usuario cuánto desea invertir.',
    };
  }

  const result = simulateCdt({ amount: investAmount, termDays: termDays ?? 90 });

  if (result.eligible) {
    await logProductInterest(userId, 'cdt');
  }

  return { success: true, simulation: result };
}

export async function runEvaluateProductFit(userId, { productId, variant = null }) {
  if (!isOfficialProductId(productId)) {
    return { success: false, message: 'Producto no oficial. Solo productos de la base de conocimiento Serfinanza.' };
  }

  const profile = await getUserProfile(userId);
  if (!isPhase1Complete(profile)) {
    return {
      success: false,
      message: 'Fase 1 incompleta. Captura todos los datos obligatorios antes de evaluar productos.',
    };
  }

  const eligibility = evaluateProductEligibility(productId, profile, variant);

  await logProductInterest(userId, productId, variant);

  return { success: true, eligibility, phase1Complete: true };
}

export function profileToContext(profile) {
  if (!profile) return null;
  return {
    objective: profile.objective,
    monthlyIncome: profile.monthlyIncome,
    currentSavings: profile.currentSavings,
    fixedExpenses: profile.fixedExpenses,
    monthlyDebtPayments: profile.monthlyDebtPayments,
    age: profile.age,
    employmentSeniority: profile.employmentSeniority,
    targetProduct: profile.targetProduct,
    goalTimeframe: profile.goalTimeframe,
    productsOfInterest: profile.productsOfInterest,
    employmentType: profile.employmentType,
    inferredProfile: profile.inferredProfile,
    urgencyLevel: profile.urgencyLevel,
    financialHealthScore: profile.financialHealthScore,
    phase1Complete: isPhase1Complete(profile),
    lastProductConsulted: profile.productsOfInterest?.at(-1) ?? null,
  };
}
