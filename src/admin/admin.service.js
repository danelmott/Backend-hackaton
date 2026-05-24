import { prisma } from '../lib/prismaClient.js';
import {
  OFFICIAL_PRODUCT_IDS,
  OFFICIAL_PRODUCTS,
  evaluateProductEligibility,
} from '../lib/productCatalog.js';
import {
  isPhase1Complete,
  PHASE_1_FIELD_KEYS,
} from '../profile/profile.service.js';

const URGENCY_WEIGHT = { listo: 3, evaluando: 2, explorando: 1 };

export function computeDebtCapacity(profile) {
  const income = profile?.monthlyIncome ?? 0;
  const debtPayments = profile?.monthlyDebtPayments ?? 0;

  if (!income) {
    return {
      debtRatio: null,
      availableQuota: null,
      classification: null,
      classificationLabel: 'Sin datos',
      formulas: null,
    };
  }

  const debtRatio = Math.round((debtPayments / income) * 1000) / 10;
  const maxQuotaAllowed = Math.round(income * 0.35);
  const availableQuota = Math.round(maxQuotaAllowed - debtPayments);

  let classification;
  let classificationLabel;
  if (debtRatio < 30) {
    classification = 'saludable';
    classificationLabel = 'Saludable';
  } else if (debtRatio < 40) {
    classification = 'aceptable';
    classificationLabel = 'Aceptable';
  } else if (debtRatio < 50) {
    classification = 'riesgoso';
    classificationLabel = 'Riesgoso';
  } else {
    classification = 'sobreendeudado';
    classificationLabel = 'Sobreendeudado';
  }

  return {
    debtRatio,
    availableQuota,
    maxQuotaAllowed,
    debtPayments,
    monthlyIncome: income,
    classification,
    classificationLabel,
    formulas: {
      debtRatio: `(${debtPayments.toLocaleString('es-CO')} ÷ ${income.toLocaleString('es-CO')}) × 100 = ${debtRatio}%`,
      availableQuota: `(${income.toLocaleString('es-CO')} × 0,35) − ${debtPayments.toLocaleString('es-CO')} = $${availableQuota.toLocaleString('es-CO')}`,
    },
  };
}

function getPhase1Missing(profile) {
  if (!profile) return [...PHASE_1_FIELD_KEYS];
  return PHASE_1_FIELD_KEYS.filter((key) => {
    const val = profile[key];
    if (key === 'monthlyDebtPayments') return val === null || val === undefined;
    return val === null || val === undefined || val === '';
  });
}

function getProfilePhase(profile) {
  if (!profile) return { phase: 0, label: 'Sin perfil', phase1Complete: false };
  const phase1Complete = isPhase1Complete(profile);
  const missing = getPhase1Missing(profile);

  if (!phase1Complete) {
    return {
      phase: 1,
      label: `Fase 1 — Captura (${PHASE_1_FIELD_KEYS.length - missing.length}/${PHASE_1_FIELD_KEYS.length})`,
      phase1Complete: false,
      missingFields: missing,
    };
  }

  const debt = computeDebtCapacity(profile);
  if (debt.classification === 'sobreendeudado') {
    return { phase: 3, label: 'Fase 3 — Sobreendeudado', phase1Complete: true };
  }

  const hasInterest = (profile.productsOfInterest?.length ?? 0) > 0;
  if (hasInterest) {
    return { phase: 4, label: 'Fase 4 — Recomendación', phase1Complete: true };
  }

  return { phase: 2, label: 'Fase 2 — Validación', phase1Complete: true };
}

function computePotentialPlacement(profile, productId, eligible) {
  if (!eligible || !productId) return 0;

  if (productId === 'cdt') {
    return profile?.currentSavings ?? 0;
  }

  if (productId === 'tarjeta_credito') {
    const income = profile?.monthlyIncome ?? 0;
    const debt = profile?.monthlyDebtPayments ?? 0;
    const available = Math.max(0, Math.round(income * 0.35 - debt));
    const maxQuota = OFFICIAL_PRODUCTS.tarjeta_credito.variantDetails.Clásica.maxQuota;
    return Math.min(available > 0 ? available * 12 : 0, maxQuota) || maxQuota;
  }

  return 0;
}

function detectInconsistencies(profile, lead) {
  const flags = [];
  const phase = getProfilePhase(profile);

  if (lead.urgencyLevel === 'listo' && !lead.topProductId && !profile?.targetProduct) {
    flags.push({ type: 'missing_product', message: 'Marcado "listo" sin producto seleccionado' });
  }

  if (lead.urgencyLevel === 'listo' && !phase.phase1Complete) {
    flags.push({ type: 'incomplete_profile', message: 'Marcado "listo" con perfil incompleto' });
  }

  if (lead.eligible === true && !phase.phase1Complete) {
    flags.push({ type: 'eligible_incomplete', message: 'Elegible pero Fase 1 incompleta' });
  }

  if (phase.phase1Complete && lead.eligible === false && lead.topProductId) {
    flags.push({ type: 'not_eligible', message: 'Perfil completo pero no elegible para producto' });
  }

  return flags;
}

function computeNextAction(profile, lead, phase, debtCapacity) {
  if (!profile || !phase.phase1Complete) {
    const missing = getPhase1Missing(profile);
    const count = missing.length;
    return {
      label: 'Falta completar perfil',
      detail: `Faltan ${count} dato${count === 1 ? '' : 's'} obligatorio${count === 1 ? '' : 's'} de Fase 1`,
      priority: 'medium',
    };
  }

  if (lead.eligible === true && lead.urgencyLevel === 'listo') {
    return {
      label: 'Llamar hoy',
      detail: `Elegible para ${lead.topProduct ?? 'producto'}. Capacidad de cuota: $${(debtCapacity.availableQuota ?? 0).toLocaleString('es-CO')}`,
      priority: 'high',
    };
  }

  if (lead.eligible === true && lead.urgencyLevel === 'evaluando') {
    return {
      label: 'Agendar llamada',
      detail: `Elegible para ${lead.topProduct ?? 'producto'}. Confirmar interés y documentos.`,
      priority: 'high',
    };
  }

  if (lead.eligible === false && lead.topProductId) {
    return {
      label: 'Pedir soportes de ingreso',
      detail: lead.eligibilityReason ?? 'No cumple requisitos mínimos. Orientar sobre alternativas.',
      priority: 'low',
    };
  }

  if (debtCapacity.classification === 'sobreendeudado') {
    return {
      label: 'Orientar reestructuración',
      detail: `Endeudamiento ${debtCapacity.debtRatio}%. No viable para nuevo crédito.`,
      priority: 'low',
    };
  }

  if (lead.urgencyLevel === 'explorando') {
    return {
      label: 'Nutrir lead',
      detail: 'Usuario explorando. Enviar info del producto de interés.',
      priority: 'low',
    };
  }

  return {
    label: 'Seguimiento',
    detail: 'Revisar perfil y confirmar producto de interés.',
    priority: 'medium',
  };
}

function computeLeadPriority(lead) {
  let score = 0;
  score += (URGENCY_WEIGHT[lead.urgencyLevel] ?? 0) * 100;
  if (lead.eligible === true) score += 200;
  if (lead.nextAction?.priority === 'high') score += 50;
  score += (lead.financialHealthScore ?? 0);
  if (lead.inconsistencies?.length > 0) score -= 30;
  return score;
}

function buildLeadFromProfile(profile) {
  const topInterest = profile.productsOfInterest?.at(-1) ?? profile.targetProduct ?? null;
  const productId = topInterest || null;
  const eligibility = productId && OFFICIAL_PRODUCTS[productId]
    ? evaluateProductEligibility(productId, profile)
    : null;

  const debtCapacity = computeDebtCapacity(profile);
  const phase = getProfilePhase(profile);
  const productName = productId
    ? OFFICIAL_PRODUCTS[productId]?.name ?? profile.targetProduct ?? productId
    : null;

  const base = {
    userId: profile.userId,
    email: profile.user?.email ?? null,
    objective: profile.objective,
    employmentType: profile.employmentType,
    employmentSeniority: profile.employmentSeniority,
    monthlyIncome: profile.monthlyIncome,
    monthlyDebtPayments: profile.monthlyDebtPayments,
    currentSavings: profile.currentSavings,
    age: profile.age,
    urgencyLevel: profile.urgencyLevel ?? 'explorando',
    financialHealthScore: profile.financialHealthScore,
    topProduct: productName,
    topProductId: productId,
    targetProduct: profile.targetProduct,
    eligible: eligibility?.eligible ?? null,
    eligibilityReason: eligibility?.reason ?? null,
    profileCompleteness: countPhase1Fields(profile),
    phase1Complete: phase.phase1Complete,
    phase: phase.phase,
    phaseLabel: phase.label,
    debtCapacity,
    potentialPlacement: computePotentialPlacement(profile, productId, eligibility?.eligible),
    registeredAt: profile.user?.createdAt ?? null,
    profileUpdatedAt: profile.updatedAt,
  };

  base.inconsistencies = detectInconsistencies(profile, base);
  base.nextAction = computeNextAction(profile, base, phase, debtCapacity);
  base.priorityScore = computeLeadPriority(base);

  return base;
}

function countPhase1Fields(profile) {
  if (!profile) return 0;
  return PHASE_1_FIELD_KEYS.length - getPhase1Missing(profile).length;
}

function countLegacyProfileFields(profile) {
  return [
    profile.objective,
    profile.monthlyIncome,
    profile.currentSavings,
    profile.fixedExpenses,
    profile.goalTimeframe,
    profile.employmentType,
    profile.productsOfInterest?.length,
  ].filter(Boolean).length;
}

function computeConversionRates(funnel) {
  const steps = [
    ['registeredToStarted', funnel.registered, funnel.profileStarted],
    ['startedToComplete', funnel.profileStarted, funnel.profileComplete],
    ['completeToInterest', funnel.profileComplete, funnel.withProductInterest],
    ['interestToHot', funnel.withProductInterest, funnel.hotLeads],
  ];

  const rates = {};
  for (const [key, from, to] of steps) {
    rates[key] = from > 0 ? Math.round((to / from) * 100) : 0;
  }
  return rates;
}

function computeAvgProfileCompletionDays(profiles) {
  const completeProfiles = profiles.filter((p) => isPhase1Complete(p) && p.user?.createdAt);
  if (completeProfiles.length === 0) return null;

  const totalDays = completeProfiles.reduce((sum, p) => {
    const start = new Date(p.user.createdAt).getTime();
    const end = new Date(p.updatedAt).getTime();
    return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
  }, 0);

  return Math.round(totalDays / completeProfiles.length);
}

function buildHotLeads(profiles) {
  return profiles
    .map((profile) => buildLeadFromProfile(profile))
    .filter(isHotLead)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

function isHotLead(lead) {
  return lead.urgencyLevel === 'evaluando' || lead.urgencyLevel === 'listo' || Boolean(lead.topProductId);
}

function toNotificationPayload(lead) {
  return {
    type: 'HOT_LEAD',
    userId: lead.userId,
    email: lead.email,
    urgencyLevel: lead.urgencyLevel,
    topProduct: lead.topProduct,
    eligible: lead.eligible,
    nextAction: lead.nextAction?.label ?? null,
    nextActionDetail: lead.nextAction?.detail ?? null,
    priority: lead.nextAction?.priority ?? 'medium',
    updatedAt: lead.profileUpdatedAt,
  };
}

export async function pollHotLeadNotifications(since) {
  const sinceDate = since instanceof Date ? since : new Date(since);

  const profiles = await prisma.userProfile.findMany({
    where: { updatedAt: { gt: sinceDate } },
    include: {
      user: { select: { id: true, email: true, createdAt: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  return profiles
    .map((profile) => buildLeadFromProfile(profile))
    .filter(isHotLead)
    .map(toNotificationPayload);
}

export async function getDashboardStats() {
  const [
    totalUsers,
    profilesWithData,
    productInterests,
    profiles,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.userProfile.count({
      where: {
        OR: [
          { monthlyIncome: { not: null } },
          { currentSavings: { not: null } },
          { objective: { not: null } },
        ],
      },
    }),
    prisma.productInterest.groupBy({
      by: ['productId'],
      _sum: { count: true },
      orderBy: { _sum: { count: 'desc' } },
    }),
    prisma.userProfile.findMany({
      include: {
        user: { select: { id: true, email: true, createdAt: true } },
      },
    }),
    prisma.userProfile.count({
      where: {
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const productDemand = OFFICIAL_PRODUCT_IDS.map((productId) => {
    const found = productInterests.find((p) => p.productId === productId);
    return {
      productId,
      name: OFFICIAL_PRODUCTS[productId].name,
      count: found?._sum?.count ?? 0,
    };
  }).sort((a, b) => b.count - a.count);

  const hotLeads = buildHotLeads(profiles);

  const avgHealthScore = profiles.length
    ? Math.round(
        profiles.reduce((sum, p) => sum + (p.financialHealthScore ?? 0), 0) / profiles.length
      )
    : null;

  const phase1CompleteCount = profiles.filter((p) => isPhase1Complete(p)).length;
  const legacyCompleteCount = profiles.filter((p) => countLegacyProfileFields(p) >= 5).length;

  const funnel = {
    registered: totalUsers,
    profileStarted: profilesWithData,
    profileComplete: phase1CompleteCount,
    withProductInterest: profiles.filter((p) => p.productsOfInterest.length > 0).length,
    hotLeads: hotLeads.length,
  };

  const eligibleHotLeads = hotLeads.filter((l) => l.eligible === true);
  const potentialPlacement = eligibleHotLeads.reduce((sum, l) => sum + (l.potentialPlacement ?? 0), 0);
  const avgProfileCompletionDays = computeAvgProfileCompletionDays(profiles);
  const conversionRates = computeConversionRates(funnel);

  const callTodayCount = hotLeads.filter((l) => l.nextAction?.label === 'Llamar hoy').length;

  return {
    totalUsers,
    profilesStarted: profilesWithData,
    profilesComplete: phase1CompleteCount,
    profilesCompleteLegacy: legacyCompleteCount,
    profileCompletionRate: totalUsers ? Math.round((phase1CompleteCount / totalUsers) * 100) : 0,
    hotLeadsCount: hotLeads.length,
    callTodayCount,
    topProduct: productDemand[0]?.productId ?? null,
    topProductName: productDemand[0]?.name ?? null,
    avgHealthScore,
    activeUsers7d: recentUsers,
    potentialPlacement,
    potentialPlacementLeadCount: eligibleHotLeads.length,
    avgProfileCompletionDays,
    productDemand,
    hotLeads,
    funnel,
    conversionRates,
  };
}

export async function getUserDetail(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      productInterests: { orderBy: { lastAt: 'desc' } },
      _count: { select: { chats: true } },
    },
  });

  if (!user) return null;

  const profile = user.profile;
  const lead = profile ? buildLeadFromProfile({ ...profile, user }) : null;
  const phase = getProfilePhase(profile);
  const debtCapacity = computeDebtCapacity(profile);

  const eligibilities = OFFICIAL_PRODUCT_IDS.map((productId) => ({
    productId,
    name: OFFICIAL_PRODUCTS[productId].name,
    ...evaluateProductEligibility(productId, profile),
    potentialPlacement: computePotentialPlacement(
      profile,
      productId,
      evaluateProductEligibility(productId, profile).eligible
    ),
  }));

  const primaryEligibility = lead?.topProductId
    ? eligibilities.find((e) => e.productId === lead.topProductId)
    : eligibilities.find((e) => e.eligible);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    chatsCount: user._count.chats,
    profile,
    productInterests: user.productInterests.map((i) => ({
      ...i,
      productName: OFFICIAL_PRODUCTS[i.productId]?.name ?? i.productId,
    })),
    eligibilities,
    lead,
    phase,
    debtCapacity,
    primaryEligibility,
    nextAction: lead?.nextAction ?? computeNextAction(profile, lead ?? {}, phase, debtCapacity),
    inconsistencies: lead?.inconsistencies ?? [],
    missingPhase1Fields: getPhase1Missing(profile),
  };
}

export async function getAllLeads(filters = {}) {
  const profiles = await prisma.userProfile.findMany({
    include: {
      user: { select: { id: true, email: true, createdAt: true } },
    },
  });

  let leads = buildHotLeads(profiles);

  if (filters.urgency) {
    leads = leads.filter((l) => l.urgencyLevel === filters.urgency);
  }

  if (filters.eligible === 'true') {
    leads = leads.filter((l) => l.eligible === true);
  } else if (filters.eligible === 'false') {
    leads = leads.filter((l) => l.eligible === false);
  }

  if (filters.product) {
    leads = leads.filter((l) => l.topProductId === filters.product);
  }

  return leads;
}
