import 'dotenv/config';
import { ExtractJwt, Strategy as passportJwt } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../lib/prismaClient.js';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { googleCallbackUrl } from '../lib/serverUrl.js';

const JWTStratategy = () => {
  passport.use(
    'jwt',
    new passportJwt(
      {
        jwtFromRequest: ExtractJwt.fromExtractors([
          (req) => req?.cookies?.accessToken ?? null,
        ]),
        secretOrKey: process.env.ACCESS_SIGNATURE,
      },
      (payload, done) => done(null, payload),
    ),
  );
};

const jwtRefreshStrategy = () => {
  passport.use(
    'jwt-refresh',
    new passportJwt(
      {
        jwtFromRequest: ExtractJwt.fromExtractors([
          (req) => req?.cookies?.refreshToken ?? null,
        ]),
        secretOrKey: process.env.REFRESH_SIGNATURE,
        passReqToCallback: true,
      },
      async (req, payload, done) => {
        try {
          const refreshToken = req?.cookies?.refreshToken;
          if (!refreshToken) return done(null, false);

          const stored = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
          });

          if (!stored || stored.expiresAt < new Date()) {
            return done(null, false);
          }

          return done(null, { ...payload, refreshToken });
        } catch (error) {
          return done(error, false);
        }
      },
    ),
  );
};

function localStrategy() {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { email },
            include: { accounts: true },
          });

          if (!user || !user.password) {
            return done(null, false, { message: 'Credenciales inválidas' });
          }

          const valid = await bcrypt.compare(password, user.password);

          if (!valid) {
            return done(null, false, { message: 'Credenciales inválidas' });
          }

          if (!user.emailVerified) {
            return done(null, false, {
              code: 'EMAIL_NOT_VERIFIED',
              message: 'Debes verificar tu correo antes de iniciar sesion',
              email: user.email,
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

function getGoogleCallbackURL() {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL.replace(/\/$/, '');
  }
  return googleCallbackUrl();
}

const googleStrategy = () => {
  const callbackURL = getGoogleCallbackURL();

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('[Google OAuth] GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no están definidos.');
  } else {
    console.log(`[Google OAuth] callback URL: ${callbackURL}`);
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.trim()?.toLowerCase();

          if (!email) {
            return done(null, false, {
              message: 'Google no devolvió un correo electrónico. Usa una cuenta con email verificado.',
            });
          }

          const existingUser = await prisma.user.findUnique({
            where: { email },
            include: { accounts: true },
          });

          if (existingUser) {
            const hasGoogle = existingUser.accounts.some((a) => a.provider === 'GOOGLE');

            if (!hasGoogle) {
              await prisma.account.create({
                data: {
                  provider: 'GOOGLE',
                  userId: existingUser.id,
                },
              });
            }

            if (!existingUser.emailVerified) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { emailVerified: true },
              });
            }

            const user = await prisma.user.findUnique({
              where: { id: existingUser.id },
            });

            return done(null, user);
          }

          const user = await prisma.user.create({
            data: {
              email,
              emailVerified: true,
              accounts: {
                create: {
                  provider: 'GOOGLE',
                },
              },
            },
          });

          return done(null, user);
        } catch (err) {
          console.error('[Google OAuth] Error en estrategia:', err);
          return done(err, false);
        }
      },
    ),
  );
};

export const passsportInit = () => {
  googleStrategy();
  jwtRefreshStrategy();
  JWTStratategy();
  localStrategy();
};
