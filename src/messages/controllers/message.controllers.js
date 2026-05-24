import * as messageServices from '../services/message.service.js';

export const sendMessageController = async (req, res) => {
    try {
        const userId = req.user.id;
        const chatId = req.params.id
        const { prompt } = req.body;
        
        const messages = await messageServices.sendMessage(chatId, userId, prompt);
        return res.status(201).json(messages);
    } 
    catch (error) {
        console.error('[error in controller] sendMessageController', error);
        return res.status(error.code ? 400 : 500).json(error);
    }
};

export const deleteMessageController = async (req, res) => {
    try {
        const { id } = req.params;
        
        await messageServices.deleteMessage(id);
        return res.status(200).json({ message: 'Mensaje eliminado exitosamente' });
    } 
    catch (error) {
        console.error('[error in controller] deleteMessageController', error);
        return res.status(error.code ? 400 : 500).json(error);
    }
};