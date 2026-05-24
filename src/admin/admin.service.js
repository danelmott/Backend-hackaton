import { prisma } from '../lib/prismaClient.js';
import { OFFICIAL_PRODUCT_IDS, OFFICIAL_PRODUCTS, evaluateProductEligibility } from '../lib/productCatalog.js';

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

  const hotLeads = profiles
    .map((profile) => {
      const topInterest = profile.productsOfInterest?.at(-1);
      const eligibility = topInterest
        ? evaluateProductEligibility(topInterest, profile)
        : null;

      return {
        userId: profile.userId,
        email: profile.user.email,
        objective: profile.objective,
        monthlyIncome: profile.monthlyIncome,
        currentSavings: profile.currentSavings,
        urgencyLevel: profile.urgencyLevel ?? 'explorando',
        financialHealthScore: profile.financialHealthScore,
        topProduct: topInterest ? OFFICIAL_PRODUCTS[topInterest]?.name : null,
        topProductId: topInterest,
        eligible: eligibility?.eligible ?? null,
        eligibilityReason: eligibility?.reason ?? null,
        profileCompleteness: countProfileFields(profile),
      };
    })
    .filter((lead) => lead.urgencyLevel === 'evaluando' || lead.urgencyLevel === 'listo' || lead.topProduct)
    .sort((a, b) => (b.financialHealthScore ?? 0) - (a.financialHealthScore ?? 0))
    .slice(0, 20);

  const avgHealthScore = profiles.length
    ? Math.round(
        profiles.reduce((sum, p) => sum + (p.financialHealthScore ?? 0), 0) / profiles.length
      )
    : null;

  const completeProfiles = profiles.filter((p) => countProfileFields(p) >= 5).length;

  return {
    totalUsers,
    profilesStarted: profilesWithData,
    profilesComplete: completeProfiles,
    profileCompletionRate: totalUsers ? Math.round((profilesWithData / totalUsers) * 100) : 0,
    hotLeadsCount: hotLeads.length,
    topProduct: productDemand[0]?.productId ?? null,
    topProductName: productDemand[0]?.name ?? null,
    avgHealthScore,
    activeUsers7d: recentUsers,
    productDemand,
    hotLeads,
    funnel: {
      registered: totalUsers,
      profileStarted: profilesWithData,
      profileComplete: completeProfiles,
      withProductInterest: profiles.filter((p) => p.productsOfInterest.length > 0).length,
      hotLeads: hotLeads.length,
    },
  };
}

function countProfileFields(profile) {
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

  const eligibilities = OFFICIAL_PRODUCT_IDS.map((productId) => ({
    productId,
    name: OFFICIAL_PRODUCTS[productId].name,
    ...evaluateProductEligibility(productId, user.profile),
  }));

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    chatsCount: user._count.chats,
    profile: user.profile,
    productInterests: user.productInterests.map((i) => ({
      ...i,
      productName: OFFICIAL_PRODUCTS[i.productId]?.name ?? i.productId,
    })),
    eligibilities,
  };
}

export async function getAllLeads() {
  const stats = await getDashboardStats();
  return stats.hotLeads;
}
