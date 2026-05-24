// ============================================================
//  SERFI · Constructor del System Prompt (backend)
//  Ensambla 5 capas: persona, protocolo, contexto usuario,
//  reglas y base de conocimiento oficial.
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatUserContext } from './userContext.js';
import { OFFICIAL_PRODUCTS_PROMPT } from '../lib/tools/toolDefinitions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPromptFile(filename) {
  return fs.readFileSync(path.join(__dirname, filename), 'utf-8');
}

const IDENTITY = loadPromptFile('identity.md');
const KNOWLEDGE = loadPromptFile('serfinanza_knowledge.md');
const ADVISOR_FLOW = loadPromptFile('advisorFlow.md');
const FINANCIAL_METRICS = loadPromptFile('financialMetrics.md');
const RULES = loadPromptFile('rules.md');

const PERSONAS = {
  CLIENTE: `Eres "Serfi", asesor virtual de productos Serfinanza (guía recomendativa, no el banco).
Sigues el FLUJO DE 4 FASES: captura → validación → cálculo → recomendación.
Fase 1: una pregunta por mensaje hasta completar los 7 datos obligatorios.
Respuestas cortas. No recomiendes ni calcules hasta Fase 1 completa.`,
  ASESOR: `Eres "Serfi", guía recomendativa sobre documentación oficial de Serfinanza.
No tienes acceso a sistemas del banco. Respondes con precisión sobre productos, requisitos y procesos.
Tono claro y directo, sin adornos. Recomiendas y orientas; no ejecutas operaciones bancarias.`,
};

const TOOLS_INSTRUCTIONS = `
## HERRAMIENTAS (FUNCTION CALLING)

Tienes acceso a herramientas para guardar datos y evaluar productos oficiales.
PRODUCTOS VÁLIDOS (única fuente: base de conocimiento):
${OFFICIAL_PRODUCTS_PROMPT}

Reglas de herramientas:
1. Usuario comparte dato → save_user_profile (siempre en Fase 1).
2. simulate_cdt, evaluate_product_fit, log_product_interest → SOLO si CONTEXTO dice "FASE 1: COMPLETA (7/7)".
3. Si Fase 1 incompleta: NO uses esas tres tools; pregunta el siguiente dato faltante (una pregunta).
4. Fase 4: evaluate_product_fit antes de recomendar producto del KB; simulate_cdt para CDT.
5. NUNCA inventes tasas. SMMLV referencia: 1.423.500 COP.
6. Tools guardan en esta plataforma, NO en sistemas Serfinanza.
`;

const MODE_MAP = {
  CLIENT: 'CLIENTE',
  CLIENTE: 'CLIENTE',
  ASESOR: 'ASESOR',
};

/**
 * Construye el system prompt completo.
 * @param {string} modo - Modo del chat (CLIENT, CLIENTE, ASESOR)
 * @param {object|null} userContext - Perfil financiero del usuario
 * @returns {string}
 */
export function buildSystemPrompt(modo = 'CLIENTE', userContext = null) {
  const resolvedMode = MODE_MAP[modo] || 'CLIENTE';
  const persona = PERSONAS[resolvedMode];
  const contextBlock = formatUserContext(userContext);

  return [
    persona,
    IDENTITY,
    ADVISOR_FLOW,
    TOOLS_INSTRUCTIONS,
    FINANCIAL_METRICS,
    contextBlock,
    RULES,
    `=== BASE DE CONOCIMIENTO OFICIAL ===\n${KNOWLEDGE}`,
  ].join('\n\n');
}
