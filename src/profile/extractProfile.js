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
  else if (/pensionad[oa]|jubilad[oa]/.test(lower)) extracted.employmentType = 'pensionado';
  else if (/empleado|nomina|n[oó]mina|salario/.test(lower)) extracted.employmentType = 'empleado';

  const seniorityMatch = lower.match(/(?:llevo|tengo|antig[uü]edad(?:\s+de)?)\s+(\d+)\s*(a[nñ]os?|meses?)/i);
  if (seniorityMatch) {
    const n = seniorityMatch[1];
    const unit = seniorityMatch[2].startsWith('a') ? 'años' : 'meses';
    extracted.employmentSeniority = `${n} ${unit}`;
  } else if (/m[aá]s de un a[nñ]o|m[aá]s de 1 a[nñ]o/.test(lower)) {
    extracted.employmentSeniority = '1 año';
  } else if (/menos de 6 meses|reci[eé]n empec[eé]/.test(lower)) {
    extracted.employmentSeniority = '3 meses';
  }

  const debtPatterns = [
    /(?:pago|cuotas?\s+(?:de\s+)?(?:deudas?|cr[eé]ditos?|tarjetas?))\s+(?:de\s+)?(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)/i,
    /(?:deudas?\s+(?:de|por)\s+)(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)\s*(?:al mes|mensual(?:es)?)?/i,
    /(?:cuotas?\s+mensuales?\s+(?:de\s+)?)(?:\$?\s*)?([\d.,]+\s*(?:millones?|mil)?)/i,
  ];
  for (const pattern of debtPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const amount = parseCopAmount(match[1]);
      if (amount != null) extracted.monthlyDebtPayments = amount;
      break;
    }
  }
  if (/sin deudas?|no tengo deudas?|no debo nada|cuotas?\s+0/.test(lower)) {
    extracted.monthlyDebtPayments = 0;
  }

  const ageMatch = lower.match(/(?:tengo|edad(?:\s+de)?)\s+(\d{2})\s*a[nñ]os?/i) || lower.match(/\b(\d{2})\s*a[nñ]os?\b/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    if (age >= 18 && age <= 100) extracted.age = age;
  }

  const targetProductPatterns = [
    { re: /cr[eé]dito\s+(?:de\s+)?veh[ií]culo|cr[eé]dito\s+vehicular|comprar\s+(?:un\s+)?(?:carro|veh[ií]culo|moto)/, value: 'crédito vehículo' },
    { re: /libre\s+inversi[oó]n|cr[eé]dito\s+libre/, value: 'libre inversión' },
    { re: /hipotecario|vivienda|comprar\s+casa/, value: 'crédito hipotecario' },
    { re: /cdt|certificado de dep[oó]sito/, value: 'CDT' },
    { re: /tarjeta\s+de\s+cr[eé]dito|tarjeta/, value: 'tarjeta de crédito' },
  ];
  for (const { re, value } of targetProductPatterns) {
    if (re.test(lower)) {
      extracted.targetProduct = value;
      break;
    }
  }

  const products = [];
  if (/cdt|certificado de dep[oó]sito/.test(lower) && isOfficialProductId('cdt')) products.push('cdt');
  if (/tarjeta/.test(lower) && isOfficialProductId('tarjeta_credito')) products.push('tarjeta_credito');
  if (/extracto/.test(lower) && isOfficialProductId('extractos')) products.push('extractos');
  if (/app serfinanza|registr(?:ar|o) en la app/.test(lower) && isOfficialProductId('app_serfinanza')) products.push('app_serfinanza');
  if (/actualizar datos|sarlaft/.test(lower) && isOfficialProductId('actualizacion_datos')) products.push('actualizacion_datos');
  if (products.length) extracted.productsOfInterest = products;

  return extracted;
}
