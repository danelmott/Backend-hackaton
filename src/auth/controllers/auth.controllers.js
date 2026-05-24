import * as authServices from '../services/auth.services.js'
import * as authSchemas from '../../lib/validators/auth.schemas.js'

export const logginController = async(req, res) => {
    try {
        const user = req.user;
        const accessToken = authServices.generateAccessToken(user);
        const refreshToken = authServices.generateRefreshToken(user);
        
        await authServices.saveRefreshToken(user.id, refreshToken);
        authServices.setTokenCookies(res, accessToken, refreshToken);
        
        return res.status(200).json({ user, accessToken, refreshToken });
    } 
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error interno del servidor', error: 'INTERNAL_SERVER_ERROR' });
    }
}

export const registerController = async(req, res) => {
    try {
        const validation = authSchemas.authSchema.safeParse(req.body);
        if(!validation.success) {
            return res.status(400).json({message: 'Hubo un error en la validacion de datos', error: validation.error.errors});
        }
        
        const result = await authServices.registerUser(validation.data.email, validation.data.password);
        
        return res.status(201).json({
            message: 'Si el correo electrónico no ha sido registrado previamente, se te ha enviado un código de verificación. Por favor revisa tu bandeja de entrada.'
        });
    } 
    catch (error) {
        // Obfuscate the error for security, returning a standard generic message
        return res.status(201).json({
            message: 'Si el correo electrónico no ha sido registrado previamente, se te ha enviado un código de verificación. Por favor revisa tu bandeja de entrada.'
        });
    }
}

export const verifyCodeController = async(req, res) => {
    try {
        const validation = authSchemas.validationEmailSchema.safeParse(req.body);
        if(!validation.success) {
            return res.status(400).json({message: 'Hubo un error en la validacion de datos', error: validation.error.errors});
        }
        
        const result = await authServices.verifyRegisterCode(validation.data.email, validation.data.code);
        authServices.setTokenCookies(res, result.accessToken, result.refreshToken);
        
        return res.status(200).json(result);
    } 
    catch (error) {
        return res.status(400).json(error);
    }
}

export const resendVerifyCodeController = async(req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'El correo electrónico es requerido', code: 'EMAIL_REQUIRED' });
        }
        
        await authServices.resendVerifyCode(email);
        
        return res.status(200).json({ 
            message: 'Si el correo electrónico existe y no ha sido verificado, se te ha reenviado un código. Por favor revisa tu bandeja.' 
        });
    } 
    catch (error) {
        // Obfuscate error for security logic here too
        return res.status(200).json({ 
            message: 'Si el correo electrónico existe y no ha sido verificado, se te ha reenviado un código. Por favor revisa tu bandeja.' 
        });
    }
}

export const logoutController = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            await authServices.logout(refreshToken);
        }
        
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        
        return res.status(200).json({ message: 'Sesión cerrada exitosamente' });
    } 
    catch (error) {
        return res.status(500).json(error);
    }
}

export const meController = async(req, res) => {
    try {
        return res.status(200).json({ user: req.user });
    } 
    catch (error) {
        return res.status(500).json(error);
    }
}

export const refreshController = async (req, res) => {
    try {
        const userId = req.user.id;
        const oldToken = req.cookies?.refreshToken || req.body.refreshToken;
        
        if (!oldToken) {
            return res.status(401).json({ message: 'No hay token de refresco provisto', code: 'NO_REFRESH_TOKEN' });
        }
        
        const tokens = await authServices.rotateRefreshToken(userId, oldToken);
        authServices.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
        
        return res.status(200).json(tokens);
    } 
    catch (error) {
        // Clear cookies is a good practice if rotating fails
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(401).json(error);
    }
}

export const googleCallbackController = async (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    try {
        const user = req.user;

        if (!user?.id || !user?.email) {
            console.error('[Google OAuth] Usuario inválido en callback:', user);
            return res.redirect(`${clientUrl}/chat?error=google_no_user`);
        }

        const accessToken = authServices.generateAccessToken(user);
        const refreshToken = authServices.generateRefreshToken(user);

        await authServices.saveRefreshToken(user.id, refreshToken);
        authServices.setTokenCookies(res, accessToken, refreshToken);

        return res.redirect(`${clientUrl}/chat`);
    } catch (error) {
        console.error('[Google OAuth] Error en callback controller:', error);
        return res.redirect(`${clientUrl}/chat?error=google`);
    }
};