const PROFILE_FIELDS = [
  { key: 'objective', label: 'Objetivo financiero' },
  { key: 'monthlyIncome', label: 'Ingresos mensuales' },
  { key: 'currentSavings', label: 'Ahorro disponible' },
  { key: 'fixedExpenses', label: 'Gastos fijos mensuales' },
  { key: 'goalTimeframe', label: 'Plazo de la meta' },
  { key: 'productsOfInterest', label: 'Productos de interés' },
  { key: 'employmentType', label: 'Perfil laboral' },
];

function formatValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) return value.length ? value.join(', ') : null;
  return String(value);
}

/**
 * Formatea el perfil financiero del usuario para inyectarlo en el system prompt.
 * @param {object|null|undefined} profile
 * @returns {string}
 */
export function formatUserContext(profile) {
  if (!profile) {
    return `=== CONTEXTO DEL USUARIO ===
Estado del perfil: VACÍO (0/${PROFILE_FIELDS.length} campos)
No hay datos financieros registrados todavía.
Recopila datos de forma conversacional cuando la intención lo requiera.`;
  }

  const known = [];
  const missing = [];

  for (const field of PROFILE_FIELDS) {
    const formatted = formatValue(profile[field.key]);
    if (formatted) {
      known.push(`- ${field.label}: ${formatted}`);
    } else {
      missing.push(field.label);
    }
  }

  const completeness = Math.round((known.length / PROFILE_FIELDS.length) * 100);
  const status = completeness === 0 ? 'VACÍO' : completeness < 100 ? 'INCOMPLETO' : 'COMPLETO';

  const insights = [];
  if (profile.inferredProfile) insights.push(`- Perfil inferido: ${profile.inferredProfile}`);
  if (profile.lastProductConsulted) insights.push(`- Último producto consultado: ${profile.lastProductConsulted}`);
  if (profile.urgencyLevel) insights.push(`- Nivel de urgencia: ${profile.urgencyLevel}`);

  return `=== CONTEXTO DEL USUARIO ===
Estado del perfil: ${status} (${known.length}/${PROFILE_FIELDS.length} campos — ${completeness}%)

Datos conocidos:
${known.length ? known.join('\n') : '- Ninguno todavía'}

${missing.length ? `Datos faltantes prioritarios: ${missing.slice(0, 3).join(', ')}` : 'Perfil completo para personalización.'}

${insights.length ? `Insights previos:\n${insights.join('\n')}` : ''}`.trim();
}
