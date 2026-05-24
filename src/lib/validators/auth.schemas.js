import z, { email } from 'zod';

export const authSchema = z.object({
    email: z.string().email({
        message: "El formato del correo electrónico no es válido."
    }),
    password: z.string()
        .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
        .regex(/[A-Z]/, { message: "La contraseña debe contener al menos una letra mayúscula." })
        .regex(/[0-9]/, { message: "La contraseña debe contener al menos un número." })
        .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: "La contraseña debe contener al menos un carácter especial." })
});

export const validationEmailSchema = z.object({
    email: z.string().email({
        message: 'El formato de correo electronico no es valido'
    }),
    code: z.string().length(6, { message: 'El código debe tener exactamente 6 caracteres.' })
});

export const resendEmailSchema = z.object({
    email: z.string().email({
        message: 'El formato de correo electronico no es valido'
    })
})

