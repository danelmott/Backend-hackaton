import { Router } from "express";
import passport from "passport";
import { requireAuth } from "../middlewares/requireAuth.js";
import * as authControllers from './controllers/auth.controllers.js';
import { redirectToClient } from '../lib/clientUrl.js';

const router = Router();


router.post('/login', (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
            console.error('[Login]', err);
            return res.status(500).json({
                message: 'Error interno del servidor',
                code: 'INTERNAL_SERVER_ERROR',
            });
        }

        if (!user) {
            const isUnverified = info?.code === 'EMAIL_NOT_VERIFIED';

            return res.status(isUnverified ? 403 : 401).json({
                code: info?.code || 'INVALID_CREDENTIALS',
                message: info?.message || 'Credenciales inválidas',
                ...(isUnverified && info?.email ? { email: info.email } : {}),
            });
        }

        req.user = user;
        return authControllers.logginController(req, res, next);
    })(req, res, next);
});
router.post('/register', authControllers.registerController);
router.post('/verification-user', authControllers.verifyCodeController);
router.post('/resend-verification', authControllers.resendVerifyCodeController);
router.post('/logout', authControllers.logoutController);
router.post('/refresh', passport.authenticate('jwt-refresh', {session: false}), authControllers.refreshController);

router.get('/me', requireAuth, authControllers.meController);

router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) {
            console.error('[Google OAuth] Error en callback:', err);
            return redirectToClient(res, '/chat?error=google_server');
        }

        if (!user) {
            console.error('[Google OAuth] Autenticación rechazada:', info);
            return redirectToClient(res, '/chat?error=google_denied');
        }

        req.user = user;
        return authControllers.googleCallbackController(req, res, next);
    })(req, res, next);
});

export default router
