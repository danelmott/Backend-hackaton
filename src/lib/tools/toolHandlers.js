import {
  saveUserProfile,
  logProductInterest,
  runSimulateCdt,
  runEvaluateProductFit,
  profileToContext,
} from '../../profile/profile.service.js';

export async function executeTool(name, input, userId) {
  try {
    switch (name) {
      case 'save_user_profile': {
        const profile = await saveUserProfile(userId, input);
        return {
          success: true,
          profile: profileToContext(profile),
          message: 'Perfil actualizado correctamente.',
        };
      }

      case 'log_product_interest': {
        const interest = await logProductInterest(userId, input.productId, input.variant ?? null);
        return {
          success: true,
          productId: interest.productId,
          variant: interest.variant,
          count: interest.count,
        };
      }

      case 'simulate_cdt': {
        return await runSimulateCdt(userId, input);
      }

      case 'evaluate_product_fit': {
        return await runEvaluateProductFit(userId, input);
      }

      default:
        return { success: false, message: `Tool desconocida: ${name}` };
    }
  } catch (error) {
    console.error(`[tool:${name}]`, error);
    return {
      success: false,
      message: error.message || 'Error ejecutando la herramienta.',
      code: error.code,
    };
  }
}
