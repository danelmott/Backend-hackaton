export const verificationCodeTemplate = (code) => `
    <div style="max-width:440px; margin:0 auto; background:#ffffff; border-radius:12px; border:1px solid #ebebeb; padding:40px 32px; font-family:Arial,sans-serif;">
        <p style="font-size:14px; color:#888; margin:0 0 32px; line-height:1.6;">
            Usa este código para verificar tu cuenta. Expira en 15 minutos.
        </p>
        
        <div style="border:1px solid #ebebeb; border-radius:8px; padding:24px; text-align:center; margin-bottom:32px;">
            <p style="font-size:38px; font-weight:500; color:#111; margin:0; letter-spacing:12px; font-family:monospace;">${code}</p>
        </div>
        
        <p style="font-size:12px; color:#bbb; margin:0; line-height:1.5; border-top:1px solid #f0f0f0; padding-top:24px;">
            Si no solicitaste esto, ignora este correo.
        </p>
    </div>
`;