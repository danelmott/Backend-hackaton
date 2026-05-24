import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from '../prompts/buildSystemPrompt.js'
import { TOOL_DEFINITIONS } from './tools/toolDefinitions.js'
import { executeTool } from './tools/toolHandlers.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ITERATIONS = 5;

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

function extractText(response) {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

function messageLikelyHasProfileData(text = '') {
  const lower = text.toLowerCase();
  return /gano|ingreso|tengo|ahorr|invert|gast|millon|mil|meses|empleado|independiente|cdt|tarjeta|objetivo|meta/.test(lower);
}

export async function askClaude(options, legacyModo = 'CLIENTE') {
  try {
    const isLegacyCall = typeof options === 'string';
    const {
      message,
      history = [],
      modo = legacyModo,
      userContext = null,
      userId = null,
    } = isLegacyCall
      ? { message: options, history: [], modo: legacyModo, userContext: null, userId: null }
      : options;

    const systemPrompt = buildSystemPrompt(modo, userContext);
    let messages = buildMessages(history, message);

    const useTools = Boolean(userId);
    const shouldForceProfileTool = useTools && messageLikelyHasProfileData(message);

    let response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
      tools: useTools ? TOOL_DEFINITIONS : undefined,
      tool_choice: shouldForceProfileTool
        ? { type: 'any' }
        : useTools
          ? { type: 'auto' }
          : undefined,
    });

    let iterations = 0;

    while (response.stop_reason === 'tool_use' && userId && iterations < MAX_TOOL_ITERATIONS) {
      iterations += 1;

      const toolUseBlocks = response.content.filter((block) => block.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`[askClaude] tool → ${toolUse.name}`, toolUse.input);
        const result = await executeTool(toolUse.name, toolUse.input, userId);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];

      response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: { type: 'auto' },
      });
    }

    return extractText(response);
  }
  catch (error) {
    console.error('[askClaude]', error)
    throw error
  }
}
