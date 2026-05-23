// ============================================================
//  SERFI · Constructor del System Prompt (backend)
//  Carga el conocimiento desde el archivo markdown y arma el
//  system prompt según el modo (cliente o asesor).
//  El conocimiento NO está como variable plana: vive en
//  /prompts/serfinanza_knowledge.md
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga el conocimiento una sola vez al iniciar el servidor (cache en memoria)
const KNOWLEDGE = fs.readFileSync(
  path.join(__dirname, 'serfinanza_knowledge.md'),
  'utf-8'
);

const PERSONAS = {
  CLIENTE: `Eres "Serfi", el asistente virtual del Banco Serfinanza que atiende a CLIENTES del banco. Hablas de forma cálida, cercana y clara, como un buen asesor que explica sin tecnicismos. Tratas al usuario de "tú". Eres breve y directo.`,
  ASESOR: `Eres "Serfi", el copiloto de conocimiento para ASESORES y empleados del Banco Serfinanza. Das respuestas precisas, completas y operativas para que el asesor resuelva al cliente al instante. Incluyes los detalles relevantes (plazos, montos, pasos exactos). Tono profesional y eficiente.`,
};

const REGLAS = `
Tu ÚNICA fuente de verdad es la base de conocimiento oficial que aparece más abajo. Reglas estrictas:

1. Responde SOLO con información que esté en la base de conocimiento. NUNCA inventes datos, cifras, plazos ni procesos.
2. Si la pregunta NO se puede responder con la base de conocimiento, dilo honestamente: "Esa información no está en mis documentos oficiales. Te recomiendo comunicarte con la línea 01 8000 123 456." No inventes.
3. Al final de cada respuesta, indica de qué documento(s) sacaste la información usando EXACTAMENTE este formato en la última línea: [FUENTE: nombre del documento]
   Documentos disponibles: "Tarjeta de Crédito", "Actualización de Datos", "CDT", "Registro App", "Extractos".
4. Sé conciso. Usa viñetas solo cuando ayuden. No repitas la pregunta.
`;

/**
 * Construye el system prompt completo para un modo dado.
 * @param {"CLIENTE"|"ASESOR"} modo
 * @returns {string}
 */
export function buildSystemPrompt(modo = 'CLIENTE') {
  const persona = PERSONAS[modo] || PERSONAS.CLIENTE;
  return `${persona}
${REGLAS}
=== BASE DE CONOCIMIENTO OFICIAL ===
${KNOWLEDGE}`;
}
