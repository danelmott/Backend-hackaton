/**
 * URL base del frontend. CORS, redirecciones post-auth y OAuth usan esto.
 * En producción define CLIENT_URL (ej. https://tu-frontend.com).
 */
export function getClientUrl() {
  const fromEnv = process.env.CLIENT_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return 'http://localhost:3000';
}

export function clientPath(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getClientUrl()}${normalized}`;
}

export function redirectToClient(res, path = '/') {
  return res.redirect(clientPath(path));
}
