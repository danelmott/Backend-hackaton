import prisma from '../lib/prismaClient.js'

export const createChat = async (
  userId,
  title,
  mode = 'CLIENT'
) => {
  return prisma.chat.create({
    data: {
      title,
      mode,
      userId,
    },
  })
}

export const getUserChats = async (userId) => {
  return prisma.chat.findMany({
    where: {
      userId,
    },

    orderBy: {
      updatedAt: 'desc',
    },
  })
}

export const getChatById = async (chatId) => {
  return prisma.chat.findUnique({
    where: {
      id: chatId,
    },

    include: {
      messages: true,
    },
  })
}

export const updateChat = async (chatId, title) => {
  return prisma.chat.update({
    where: {
      id: chatId,
    },
    data: {
      title,
    },
  })
}

export const deleteChat = async (chatId) => {
  return prisma.chat.delete({
    where: {
      id: chatId,
    },
  })
}