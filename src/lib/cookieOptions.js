const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Cookies de auth para frontend y API en dominios distintos (Render + Vercel).
 */
export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
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
