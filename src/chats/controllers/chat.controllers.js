import * as chatServices from '../service/chat.service.js';

export const createChatController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, mode } = req.body;
        
        const newChat = await chatServices.createChat(userId, title, mode);
        return res.status(201).json(newChat);
    } 
    catch (error) {
        console.error('[error in controller] createChatController', error);
        return res.status(error.code ? 400 : 500).json(error);
    }
};

export const getUserChatsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const chats = await chatServices.getUserChats(userId);
        return res.status(200).json(chats);
    } 
    catch (error) {
        console.error('[error in controller] getUserChatsController', error);
        return res.status(error.code ? 400 : 500).json(error);
    }
};

export const getChatByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const chat = await chatServices.getChatById(id);
        
        if (!chat) {
            return res.status(404).json({ message: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' });
        }
        
        return res.status(200).json(chat);
    } 
    catch (error) {
        console.error('[error in controller] getChatByIdController', error);
        return res.status(error.code ? 400 : 500).json(error);
    }
};

export const updateChatController = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const updatedChat = await chatServices.updateChat(id, title);
        return res.status(200).json(updatedChat);
    } 
    catch (error) {
        console.error('[error in controller] updateChatController', error);
        return res.status(error.code ? 400 : 500).json(error);
    }
};

export const deleteChatController = async (req, res) => {
    try {
        const { id } = req.params;
        await chatServices.deleteChat(id);
        return res.status(200).json({ message: 'Chat eliminado exitosamente' });
    } 
    catch (error) {
        console.error('[error in controller] deleteChatController', error);
        return res.status(error.code ? 400 : 500).json(error);
    }
};