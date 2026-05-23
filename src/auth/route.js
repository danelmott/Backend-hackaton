import { Router } from "express";
import passport from "passport";
import { requireAuth } from "../middlewares/requireAuth.js";
import * as authControllers from './controllers/auth.controllers.js';

const router = Router();


router.post('/login', passport.authenticate('local', {session: false}) , authControllers.logginController);
router.post('/register', authControllers.registerController);
router.post('/verification-user', authControllers.verifyCodeController);
router.post('/resend-verification', authControllers.resendVerifyCodeController);
router.post('/logout', authControllers.logoutController);
router.post('/refresh', passport.authenticate('jwt-refresh', {session: false}), authControllers.refreshController);

router.get('/me', requireAuth, authControllers.meController);
router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google` }),
    authControllers.googleCallbackController 
);

export default router