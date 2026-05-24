/**
 * URL pública del API (Render define RENDER_EXTERNAL_URL en deploy).
 */
export function getServerUrl() {
  const fromEnv = process.env.API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const renderUrl = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '');
  if (renderUrl) return renderUrl;

  const port = process.env.PORT || 4000;
  return `http://localhost:${port}`;
}

export function googleCallbackUrl() {
  return `${getServerUrl()}/auth/google/callback`;
}
