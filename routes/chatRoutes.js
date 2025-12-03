const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateJWT = require('../middlewares/authenticateJWT');
const { uploadChat } = require('../middlewares/uploadMiddlewares');

// Crear sala de chat para intercambio
router.post('/create-room', chatController.createRoom);

// Obtener historial de mensajes de una sala
router.get('/messages/:chatRoomId', chatController.getMessages);

// Subir imagen para un chat específico
router.post(
	'/messages/:chatRoomId/upload',
	authenticateJWT,
	uploadChat.single('image'),
	chatController.uploadChatImage
);

// Obtener información de una sala de chat por ID
router.get('/rooms/:id', chatController.getChatRoom);

// Obtener todas las salas de chat de un usuario
router.get('/user/:userId', chatController.getUserChatRooms);

// Eliminar una sala de chat y sus mensajes asociados
router.delete('/rooms/:chatRoomId', authenticateJWT, chatController.deleteChat);

module.exports = router;