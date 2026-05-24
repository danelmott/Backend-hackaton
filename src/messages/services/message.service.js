import 'dotenv/config';
import { prisma } from "../../lib/prismaClient.js";
import { askClaude } from '../../lib/IA.service.js';
import { getUserProfile, profileToContext, saveUserProfile } from '../../profile/profile.service.js';
import { extractProfileFromMessage } from '../../profile/extractProfile.js';
import { getNextStructuredQuestion, getQuestionsState } from '../../profile/question.service.js';

const DEFAULT_CHAT_TITLE = 'Nuevo chat';
const TITLE_MAX_LENGTH = 60;
const MAX_HISTORY_FOR_AI = 20;

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

        const previousMessages = await prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: 'asc' },
            take: MAX_HISTORY_FOR_AI,
            select: { role: true, content: true },
        });

        const isFirstMessage = previousMessages.length === 0;
        
        const userMessage = await prisma.message.create({
            data: {
                chatId,
                role: 'USER',
                content
            }
        });
        
        const extracted = extractProfileFromMessage(content);
        if (Object.keys(extracted).length > 0) {
            await saveUserProfile(userId, extracted);
        }

        let profile = await getUserProfile(userId);

        const aiResponse = await askClaude({
            message: content,
            history: previousMessages,
            modo: chat.mode,
            userContext: profileToContext(profile),
            userId,
        });

        profile = await getUserProfile(userId);
        const questionsState = getQuestionsState(profile);
        const structuredQuestion = getNextStructuredQuestion(profile);
        
        const assistantMessage = await prisma.message.create({
            data: {
                chatId,
                role: 'ASSISTANT',
                content: aiResponse
            }
        });
        
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
            structuredQuestion,
            questionsState,
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
