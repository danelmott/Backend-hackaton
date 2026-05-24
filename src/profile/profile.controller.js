import {
  getUserProfile,
  saveUserProfile,
} from './profile.service.js';
import {
  getQuestionsState,
  normalizeFieldValue,
  PHASE_1_QUESTIONS,
  formatAnswerForChat,
} from './question.service.js';

export async function getProfileController(req, res) {
  try {
    const userId = req.user.id;
    const profile = await getUserProfile(userId);
    const questionsState = getQuestionsState(profile);

    return res.status(200).json({
      profile: profile ?? null,
      questionsState,
    });
  } catch (error) {
    console.error('[error in controller] getProfileController', error);
    return res.status(error.code ? 400 : 500).json(error);
  }
}

export async function updateProfileController(req, res) {
  try {
    const userId = req.user.id;
    const { field, value, data } = req.body;

    let payload = data;

    if (field) {
      if (!PHASE_1_QUESTIONS[field]) {
        return res.status(400).json({
          code: 'INVALID_FIELD',
          message: 'Campo de perfil no válido.',
        });
      }

      const normalized = normalizeFieldValue(field, value);
      if (normalized === null) {
        return res.status(400).json({
          code: 'INVALID_VALUE',
          message: 'El valor proporcionado no es válido.',
        });
      }

      payload = { [field]: normalized };
    }

    if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
      return res.status(400).json({
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Se requiere field/value o data.',
      });
    }

    const profile = await saveUserProfile(userId, payload);
    const questionsState = getQuestionsState(profile);
    const savedField = field ?? Object.keys(payload)[0];
    const savedValue = field ? normalizeFieldValue(field, value) : payload[savedField];

    return res.status(200).json({
      profile,
      questionsState,
      formattedAnswer: savedField ? formatAnswerForChat(savedField, savedValue) : null,
    });
  } catch (error) {
    console.error('[error in controller] updateProfileController', error);
    return res.status(error.code ? 400 : 500).json(error);
  }
}
