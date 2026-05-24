import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Serfinanza Soporte" <${process.env.SMTP_USER}>`, 
            to,
            subject,
            html,
        });
        return info;
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        throw error;
    }
};