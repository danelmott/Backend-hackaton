import 'dotenv/config';
import { prisma } from "../../lib/prismaClient.js";
import { askClaude } from '../../lib/IA.service.js';

const DEFAULT_CHAT_TITLE = 'Nuevo chat';
const TITLE_MAX_LENGTH = 60;

function truncateTitle(text) {
    const trimmed = text.trim().replace(/\s+/g, ' ');
    if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
    return `${trimmed.slice(0, TITLE_MAX_LENGTH).trimEnd()}…`;
}

export const sendMessage = async (chatId, userId, content) => {
    try {
        if (!chatId || !userId || !content) {
            throw { code: 'MISSING_REQUIRED_FIELDS', message: 'Faltan campos requeridos (chatId, userId, content)' };
        }
        
        const chat = await prisma.chat.findUnique({
            where: { id: chatId }
        });
        
        if (!chat) throw { code: 'CHAT_NOT_FOUND', message: 'El chat no existe' };
        if (chat.userId !== userId) throw { code: 'UNAUTHORIZED_CHAT_ACCESS', message: 'No tienes permisos para este chat' };

        const existingMessagesCount = await prisma.message.count({
            where: { chatId },
        });
        const isFirstMessage = existingMessagesCount === 0;
        
        // 2. Guardar el mensaje del usuario en la base de datos
        const userMessage = await prisma.message.create({
            data: {
                chatId,
                role: 'USER',
                content
            }
        });
        
        // 3. Consultar a Claude usando el modo del chat
        const aiResponse = await askClaude(content, chat.mode);
        
        // 4. Guardar la respuesta del asistente en la base de datos
        const assistantMessage = await prisma.message.create({
            data: {
                chatId,
                role: 'ASSISTANT',
                content: aiResponse
            }
        });
        
        // Opcional: Actualizar el updatedAt del chat y título con el primer mensaje
        const chatTitle = isFirstMessage ? truncateTitle(content) : undefined;

        await prisma.chat.update({
            where: { id: chatId },
            data: {
                updatedAt: new Date(),
                ...(chatTitle ? { title: chatTitle } : {}),
            },
        });
        
        return {
            userMessage,
            assistantMessage,
            ...(chatTitle ? { chatTitle } : {}),
        };
    } 
    catch (error) {
        console.error('[error] error sending message', error);
        if (error.code) throw error;
        
        throw {
            code: 'ERROR_SENDING_MESSAGE',
            message: 'Hubo un error en el procesamiento del mensaje'
        };
    }
}
//aun no se utiliza
export const deleteMessage = async (messageId) => {
    try {
        if (!messageId) throw { code: 'MISSING_REQUIRED_FIELDS', message: 'El messageId es requerido' };
        
        return await prisma.message.delete({
            where: { id: messageId }
        });
    } 
    catch (error) {
        console.error('[error] error deleting message', error);
        if (error.code) throw error;
        
        throw {
            code: 'ERROR_DELETING_MESSAGE',
            message: 'Hubo un error al intentar eliminar el mensaje'
        };
    }
}

