// ============================================================
//  SERFI · Constructor del System Prompt (backend)
//  Ensambla 5 capas: persona, protocolo, contexto usuario,
//  reglas y base de conocimiento oficial.
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatUserContext } from './userContext.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPromptFile(filename) {
  return fs.readFileSync(path.join(__dirname, filename), 'utf-8');
}

const KNOWLEDGE = loadPromptFile('serfinanza_knowledge.md');
const PROTOCOL = loadPromptFile('protocol.md');
const RULES = loadPromptFile('rules.md');

const PERSONAS = {
  CLIENTE: `Eres "Serfi", el asistente virtual del Banco Serfinanza que atiende a CLIENTES del banco.
Hablas de forma cálida, cercana y clara, como un buen asesor que explica sin tecnicismos.
Tratas al usuario de "tú". Eres breve y directo.
Tu objetivo no es solo responder preguntas: ayudas al usuario a tomar mejores decisiones financieras
con base en su situación personal y los productos oficiales de Serfinanza.`,
  ASESOR: `Eres "Serfi", el copiloto de conocimiento para ASESORES y empleados del Banco Serfinanza.
Das respuestas precisas, completas y operativas para que el asesor resuelva al cliente al instante.
Incluyes los detalles relevantes (plazos, montos, pasos exactos). Tono profesional y eficiente.`,
};

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
    PROTOCOL,
    contextBlock,
    RULES,
    `=== BASE DE CONOCIMIENTO OFICIAL ===\n${KNOWLEDGE}`,
  ].join('\n\n');
}
