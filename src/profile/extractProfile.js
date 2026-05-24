import { isOfficialProductId } from '../lib/productCatalog.js';

function parseCopAmount(raw) {
  if (raw == null) return null;
  let text = String(raw).toLowerCase().trim();
  text = text.replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '');

  const millionMatch = text.match(/([\d.,]+)\s*millones?/);
  if (millionMatch) {
    const base = parseFloat(millionMatch[1].replace(',', '.'));
    return Math.round(base * 1_000_000);
  }

  const milMatch = text.match(/([\d.,]+)\s*mil/);
  if (milMatch) {
    const base = parseFloat(milMatch[1].replace(',', '.'));
    return Math.round(base * 1_000);
  }

  const numeric = text.match(/([\d]+)/);
  if (!numeric) return null;
  const value = parseInt(numeric[1], 10);
  if (Number.isNaN(value)) return null;
  // Cifras pequeñas en contexto de millones suelen ser millones
  if (value > 0 && value < 100 && text.includes('millon')) return value * 1_000_000;
  return value;
}

/**
 * Extrae datos financieros del mensaje del usuario como respaldo
 * cuando el modelo no invoque save_user_profile.
 */
export function extractProfileFromMessage(text) {
  if (!text) return {};

  const lower = text.toLowerCase();
  const extracted = {};

  const incomePatterns = [
    /gano\s+(?:aprox(?:imadamente)?\.?\s*)?(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)/i,
    /ingreso(?:s)?\s+(?:de|mensual(?:es)?\s+(?:de)?)?\s*(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)/i,
    /recibo\s+(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)/i,
  ];
  for (const pattern of incomePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const amount = parseCopAmount(match[1]);
      if (amount) extracted.monthlyIncome = amount;
      break;
    }
  }

  const savingsPatterns = [
    /tengo\s+(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)\s*(?:ahorrados?|guardados?|disponibles?)?/i,
    /(?:ahorro|ahorros)\s+(?:de\s+)?(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)/i,
    /(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)\s+(?:para\s+)?invertir/i,
  ];
  for (const pattern of savingsPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const amount = parseCopAmount(match[1]);
      if (amount) extracted.currentSavings = amount;
      break;
    }
  }

  const expensePatterns = [
    /gast(?:o|os)\s+(?:fijos?\s+)?(?:de\s+)?(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)/i,
    /arriendo\s+(?:de\s+)?(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)/i,
  ];
  for (const pattern of expensePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const amount = parseCopAmount(match[1]);
      if (amount) extracted.fixedExpenses = amount;
      break;
    }
  }

  if (/invertir|inversi[oó]n|cdt|rendimiento/.test(lower)) extracted.objective = 'invertir';
  else if (/ahorrar|ahorro|meta/.test(lower)) extracted.objective = 'ahorrar';
  else if (/deuda|cr[eé]dito|pagar/.test(lower)) extracted.objective = 'pagar deuda';
  else if (/comprar|vivienda|carro|moto/.test(lower)) extracted.objective = 'comprar';

  if (/(\d+)\s*meses?/.test(lower)) {
    const months = lower.match(/(\d+)\s*meses?/)[1];
    extracted.goalTimeframe = `${months} meses`;
  } else if (/corto plazo|mediano plazo|largo plazo/.test(lower)) {
    if (/corto plazo/.test(lower)) extracted.goalTimeframe = 'corto';
    else if (/mediano plazo/.test(lower)) extracted.goalTimeframe = 'mediano';
    else extracted.goalTimeframe = 'largo';
  }

  if (/independiente|freelance|por mi cuenta/.test(lower)) extracted.employmentType = 'independiente';
  else if (/empleado|nomina|n[oó]mina|salario/.test(lower)) extracted.employmentType = 'empleado';

  const products = [];
  if (/cdt|certificado de dep[oó]sito/.test(lower) && isOfficialProductId('cdt')) products.push('cdt');
  if (/tarjeta/.test(lower) && isOfficialProductId('tarjeta_credito')) products.push('tarjeta_credito');
  if (/extracto/.test(lower) && isOfficialProductId('extractos')) products.push('extractos');
  if (/app serfinanza|registr(?:ar|o) en la app/.test(lower) && isOfficialProductId('app_serfinanza')) products.push('app_serfinanza');
  if (/actualizar datos|sarlaft/.test(lower) && isOfficialProductId('actualizacion_datos')) products.push('actualizacion_datos');
  if (products.length) extracted.productsOfInterest = products;

  return extracted;
}
