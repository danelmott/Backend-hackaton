/**
 * URL base del frontend. Redirecciones post-auth (login, OAuth) usan CLIENT_URL.
 */
export function getClientUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function clientPath(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getClientUrl()}${normalized}`;
}

export function redirectToClient(res, path = '/') {
  return res.redirect(clientPath(path));
}
