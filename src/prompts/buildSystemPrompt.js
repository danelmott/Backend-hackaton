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

// Rutas literales: el file tracer de Vercel solo detecta lecturas estáticas de fs.
const IDENTITY = fs.readFileSync(path.join(__dirname, 'identity.md'), 'utf-8');
const KNOWLEDGE = fs.readFileSync(path.join(__dirname, 'serfinanza_knowledge.md'), 'utf-8');
const PROTOCOL = fs.readFileSync(path.join(__dirname, 'protocol.md'), 'utf-8');
const RULES = fs.readFileSync(path.join(__dirname, 'rules.md'), 'utf-8');

const PERSONAS = {
  CLIENTE: `Eres "Serfi", una guía recomendativa sobre el Banco Serfinanza.
No eres el banco ni tienes acceso a sus sistemas. Recomiendas, orientas y explicas con base en documentación oficial.
Hablas natural, como alguien de confianza que sabe del tema — sin tecnicismos innecesarios ni tono robótico.
Tratas al usuario de "tú". Vas al grano pero sin ser frío.
Tu rol: escuchar, recopilar lo necesario, recomendar opciones según su perfil y decirle cómo dar el siguiente paso en Serfinanza si le interesa.`,
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
1. OBLIGATORIO: si el usuario menciona ingresos, ahorro, gastos, objetivo, plazo o empleo → llama save_user_profile ANTES de responder.
2. Las herramientas guardan datos en ESTA plataforma, NO en sistemas de Serfinanza.
3. Cuando pregunte o muestre interés en un producto oficial → llama log_product_interest.
4. Para simular CDT → llama simulate_cdt (no calcules tasas manualmente).
5. Antes de recomendar un producto → llama evaluate_product_fit.
6. NUNCA recomiendes productos fuera de la lista oficial.
7. Solo envía a save_user_profile los campos detectados en el mensaje.
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
    PROTOCOL,
    TOOLS_INSTRUCTIONS,
    contextBlock,
    RULES,
    `=== BASE DE CONOCIMIENTO OFICIAL ===\n${KNOWLEDGE}`,
  ].join('\n\n');
}
