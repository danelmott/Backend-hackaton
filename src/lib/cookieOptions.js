const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Opciones de cookies para auth cross-domain (Vercel + API separado).
 * Prod: secure + sameSite none. Local: lax sin secure.
 */
export function getCookieOptions() {
  const prod = isProduction();

  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'none' : 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  };
}

export function setAuthCookies(res, accessToken, refreshToken) {
  const options = getCookieOptions();
  res.cookie('accessToken', accessToken, options);
  res.cookie('refreshToken', refreshToken, options);
}

export function clearAuthCookies(res) {
  const { maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);
}
