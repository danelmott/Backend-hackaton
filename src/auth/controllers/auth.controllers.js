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
        return res.status(201).json(result);
    } 
    catch (error) {
        return res.status(400).json(error);
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
        return res.status(200).json({ message: 'Código de verificación reenviado exitosamente' });
    } 
    catch (error) {
        return res.status(400).json(error);
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
    try {
        const user = req.user;
        const accessToken = authServices.generateAccessToken(user);
        const refreshToken = authServices.generateRefreshToken(user);

        await authServices.saveRefreshToken(user.id, refreshToken);
        authServices.setTokenCookies(res, accessToken, refreshToken);

        return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
    } catch(error) {
        console.error("Error in google callback controller: ", error);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
}