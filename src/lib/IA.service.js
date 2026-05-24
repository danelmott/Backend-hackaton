import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from '../prompts/buildSystemPrompt.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MAX_HISTORY_MESSAGES = 20;

function toAnthropicRole(role) {
  if (role === 'ASSISTANT') return 'assistant';
  return 'user';
}

function buildMessages(history = [], currentMessage) {
  const recentHistory = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg) => ({
      role: toAnthropicRole(msg.role),
      content: msg.content,
    }));

  return [
    ...recentHistory,
    { role: 'user', content: currentMessage },
  ];
}

/**
 * @param {object|string} options - Opciones o mensaje directo (compatibilidad)
 * @param {string} [options.message] - Mensaje actual del usuario
 * @param {Array} [options.history] - Historial previo [{ role, content }]
 * @param {string} [options.modo] - Modo del asistente
 * @param {object|null} [options.userContext] - Perfil financiero del usuario
 * @param {string} [legacyModo] - Segundo argumento legacy
 */
export async function askClaude(options, legacyModo = 'CLIENTE') {
  try {
    const isLegacyCall = typeof options === 'string';
    const {
      message,
      history = [],
      modo = legacyModo,
      userContext = null,
    } = isLegacyCall
      ? { message: options, history: [], modo: legacyModo, userContext: null }
      : options;

    const systemPrompt = buildSystemPrompt(modo, userContext);
    const messages = buildMessages(history, message);

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.text ?? '';
  }
  catch (error) {
    console.log(error)
    throw error
  }
}
