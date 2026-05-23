import 'dotenv/config';
import { prisma } from "../../lib/prismaClient.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';


//helpers
const buildPayload = (user) => {
    return {
        id: user.id,
        email: user.email,
        role: user.role ?? 'USER'
    }
}

//CODIGO DE VERFICACION DEMORA 15 MINUTOS DE VALIDEZ
const generateCode = async () => {
    const code =  Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, 12);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    return {
        code,
        hashedCode,
        expiresAt
    }
}

export const generateAccessToken = (user) => {
    return jwt.sign(buildPayload(user), process.env.ACCESS_SIGNATURE, {
        expiresIn: "15m"
    });
}

export const generateRefreshToken = (user) => {
    return jwt.sign(buildPayload(user), process.env.REFRESH_SIGNATURE, {
        expiresIn: '7d'
    });
}


export const saveRefreshToken = async (userId, token) => {
    try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        return await prisma.refreshToken.create({
            data: {
                token,
                userId,
                expiresAt
            }
        });
    } 
    catch (error) {
        console.error("Error saving refresh token:", error);
        throw error;
    }
}

//COOKIES
export const setTokenCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: 'false',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
    });
    
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: 'false',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}


export const rotateRefreshToken = async (userId, oldToken) => {
    try {
        const stored = await prisma.refreshToken.findUnique({
            where: { token: oldToken },
        });
        
        if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
            await prisma.refreshToken.deleteMany({ 
                where: { userId } 
            });
            throw {
                code: 'INVALID_REFRESH_TOKEN',
                message: 'Sesion Invalida o expirada'
            }
        }
        
        await prisma.refreshToken.delete({ where: { token: oldToken } });
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        
        await saveRefreshToken(userId, refreshToken);
        
        return { 
            accessToken, 
            refreshToken
        }
    } 
    catch (error) {
        console.error('[error] error rotating refresh token', error);
        
        if(error.code) throw error;
        
        throw {
            code: 'ERROR_ROTATING_REFRESH_TOKEN',
            message: 'Hubo un error al intentar renovar la sesion'
        }
    }
}


export const registerUser = async (email, password) => {
    try {
        const existing = await prisma.user.findUnique({
            where: { email },
            include: { accounts: true },
        });
        
        if (existing) {
            const hasLocal = existing.accounts.some((a) => a.provider === 'LOCAL');
            if (hasLocal) throw {code: 'USER_ALREADY_EXISTS', message: 'El usuario ya esta registrado'};
            
            // Tiene Google pero no LOCAL → agregar contraseña y cuenta LOCAL
            const hashed = await bcrypt.hash(password, 12);
            
            const user = await prisma.user.update({
                where: { email },
                data: { password: hashed },
            });
            
            await prisma.account.create({
                data: { provider: 'LOCAL', userId: user.id },
            });
            
            const accessToken = generateAccessToken(user)
            const refreshToken = generateRefreshToken(user)
            await saveRefreshToken(user.id, refreshToken)
            
            return { 
                user: buildPayload(user), 
                accessToken, 
                refreshToken 
            }
        }
        
        // Usuario nuevo
        const hashed = await bcrypt.hash(password, 12);
        
        const user = await prisma.user.create({
            data: { email, password: hashed },
        });
        
        await prisma.account.create({
            data: { provider: 'LOCAL', userId: user.id },
        });
        
        const verificationCode = await generateCode();
        
        await prisma.verifyToken.create({
            data: {
                userId: user.id,
                code: verificationCode.hashedCode,
                expiresAt: verificationCode.expiresAt
            }
        });
        
        await sendEmail(user.email, 'Codigo de verificacion',verificationCodeTemplate(verificationCode.code));
        
        return {requiresVerification: true}
        
    } 
    catch (error) {
        console.error('[error] error registering user', error);
        
        if(error.code) throw error;
        
        throw {
            code: 'ERROR_REGISTERING_USER',
            message: 'Hubo un error al intentar registrar el usuario'
        }
    }
}


export const verifyRegisterCode = async (email, code) => {
    try {
        const user = await prisma.user.findUnique({
            where: {email},
            include: {verifyToken: true}
        });
        
        if(!user) {
            throw {
                code: 'USER_NOT_FOUND',
                message: 'Usuario no encontrado'
            }
        }
        
        if(user.emailVerified) {
            throw {
                code: 'EMAIL_ALREADY_VERIFIED',
                message: 'El correo ya fue verificado'
            }
        }
        
        const verificationCode = user.verifyToken[0];
        
        if(!verificationCode) {
            throw {
                code: 'VERIFICATION_CODE_NOT_FOUND',
                message: 'No hay código de verifición pendiente'
            }
        }
        
        if(new Date() > new Date(verificationCode.expiresAt)) {
            throw {
                code: 'VERIFICATION_EXPIRED',
                message: 'El codigo de verficacion expiro, porfavor reenvie otro'
            }
        }
        
        const isMatch = await bcrypt.compare(code, verificationCode.code);
        
        if(!isMatch) {
            throw {
                code: 'INVALID_VERIFICATION_CODE',
                message: 'Codigo de verificacion incorrecto'
            }
        }
        
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: true }
            }),
            prisma.verifyToken.deleteMany({
                where: { userId: user.id }
            }),
            prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    expiresAt: expiresAt,
                    userId: user.id
                }
            })
        ]);
        
        return {
            accessToken,
            refreshToken
        };
        
    } 
    catch (error) {
        console.error("[error] error verificating email", error);
        
        if(error.code) throw error;
        
        throw {
            code: 'ERROR_VERIFICATING_EMAIL',
            message: 'Hubo un error al intentar verificar el email'
        }
    }
}


export const resendVerifyCode = async (email) => {
    try {
        const user = await prisma.user.findUnique({
            where: {email},
            include: {verifyToken: true}
        });
        
        if(!user) throw {code: 'USER_NOT_FOUND', message: 'Usuario no encontrado'};
        
        if(user.emailVerified) throw {code: 'EMAIL_ALREADY_VERIFIED', message: 'El correo ya fue verificado'}
        
        await prisma.verifyToken.deleteMany({
            where: {userId: user.id}
        });
        
        const code = await generateCode();
        
        await prisma.verifyToken.create({
            data: {
                code: code.hashedCode,
                expiresAt: code.expiresAt,
                userId: user.id
            }
        });
        
        await sendEmail(user.email, 'Codigo de verificacion', verificationCodeTemplate(code.code));
        
    } 
    catch (error) {
        console.error('[error] error resending verification account code', error);
        
        if(error.code) throw error;
        
        throw {
            code: 'ERROR_RESENDING_VERIFICATION_CODE',
            message: 'Hubo un error al intentar reenviar el codigo de verificacion'
        }
    } 
}



export const logout = async(refreshToken) => {
    try {
        await prisma.refreshToken.delete({
            where: {token: refreshToken}
        });
    } 
    catch (error) {
        console.error('[error] error deleting refreshToken', error);
        throw {
            code: 'ERROR_DELETING_REFRESH_TOKEN',
            message: 'Hubo un error al intentar cerrar la sesion'
        }
    }
}