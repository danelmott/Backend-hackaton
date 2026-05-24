/** Frontend en producción (Vercel). Sobrescribible con CLIENT_URL. */
const PRODUCTION_CLIENT_URL = 'https://frontend-hackaton-virid.vercel.app';

/**
 * URL base del frontend. CORS, redirecciones post-auth y OAuth usan esto.
 */
export function getClientUrl() {
  const fromEnv = process.env.CLIENT_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') return PRODUCTION_CLIENT_URL;
  return 'http://localhost:3000';
}

export function clientPath(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getClientUrl()}${normalized}`;
}

export function redirectToClient(res, path = '/') {
  return res.redirect(clientPath(path));
}
