const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Crear sala de chat para intercambio
router.post('/create-room', chatController.createRoom);

// Obtener historial de mensajes de una sala
router.get('/messages/:chatRoomId', chatController.getMessages);

// Obtener información de una sala de chat por ID
router.get('/rooms/:id', chatController.getChatRoom);

// Obtener todas las salas de chat de un usuario
router.get('/user/:userId', chatController.getUserChatRooms);

module.exports = router;