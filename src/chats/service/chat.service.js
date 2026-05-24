import { prisma } from '../../lib/prismaClient.js';

const DEFAULT_CHAT_TITLE = 'Nuevo chat';
const TITLE_MAX_LENGTH = 60;

function truncateTitle(text) {
  if (!text) return DEFAULT_CHAT_TITLE;
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LENGTH).trimEnd()}…`;
}

function resolveChatTitle(chat) {
  const firstUserMessage = chat.messages?.[0]?.content;
  if (!chat.title || chat.title === DEFAULT_CHAT_TITLE) {
    return truncateTitle(firstUserMessage) || chat.title || DEFAULT_CHAT_TITLE;
  }
  return chat.title;
}

export const createChat = async (userId, title, mode = 'CLIENT') => {
  try {
    if (!userId || !title) throw { code: 'MISSING_REQUIRED_FIELDS', message: 'El userId y title son requeridos' };

    return await prisma.chat.create({
      data: {
        title,
        mode,
        userId,
      },
    });
  } catch (error) {
    console.error('[error] error creating chat', error);
    if (error.code) throw error;
    
    throw {
      code: 'ERROR_CREATING_CHAT',
      message: 'Hubo un error al intentar crear el chat'
    };
  }
}

export const getUserChats = async (userId) => {
  try {
    if (!userId) throw { code: 'MISSING_REQUIRED_FIELDS', message: 'El userId es requerido' };

    return await prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          where: { role: 'USER' },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { content: true },
        },
      },
    }).then((chats) =>
      chats.map(({ messages, ...chat }) => ({
        ...chat,
        title: resolveChatTitle({ ...chat, messages }),
      }))
    );
  } catch (error) {
    console.error('[error] error getting user chats', error);
    if (error.code) throw error;
    
    throw {
      code: 'ERROR_GETTING_USER_CHATS',
      message: 'Hubo un error al intentar obtener los chats del usuario'
    };
  }
}

export const getChatById = async (chatId) => {
  try {
    if (!chatId) throw { code: 'MISSING_REQUIRED_FIELDS', message: 'El chatId es requerido' };

    return await prisma.chat.findUnique({
      where: { id: chatId },
      include: { messages: true },
    });
  } catch (error) {
    console.error('[error] error getting chat by id', error);
    if (error.code) throw error;
    
    throw {
      code: 'ERROR_GETTING_CHAT_BY_ID',
      message: 'Hubo un error al intentar obtener el chat'
    };
  }
}

export const updateChat = async (chatId, title) => {
  try {
    if (!chatId || !title) throw { code: 'MISSING_REQUIRED_FIELDS', message: 'El chatId y title son requeridos' };

    return await prisma.chat.update({
      where: { id: chatId },
      data: { title },
    });
  } catch (error) {
    console.error('[error] error updating chat', error);
    if (error.code) throw error;
    
    throw {
      code: 'ERROR_UPDATING_CHAT',
      message: 'Hubo un error al intentar actualizar el chat'
    };
  }
}

export const deleteChat = async (chatId) => {
  try {
    if (!chatId) throw { code: 'MISSING_REQUIRED_FIELDS', message: 'El identificador del chat es requerido' };
    
    return await prisma.chat.delete({
      where: { id: chatId },
    });
  } catch (error) {
    console.error('[error] error deleting chat', error);
    if (error.code) throw error;
    
    throw {
      code: 'ERROR_DELETING_CHAT',
      message: 'Hubo un error al intentar eliminar el chat'
    };
  }
}