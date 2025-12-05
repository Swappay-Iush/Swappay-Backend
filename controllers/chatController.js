// ======================= IMPORTACIONES =======================
// Importa el modelo ChatRoom para interactuar con la tabla chat_rooms
const ChatRoom = require('../models/ChatRoom');

// Importa el modelo User para validaciones y asociaciones de usuarios
const User = require('../models/User');

// Importa el modelo Message para gestionar mensajes del chat
const Message = require('../models/Message');

// Importa el modelo Products para validar productos
const Products = require('../models/Products');

// Importa el modelo TradeAgreement para validar acuerdos de intercambio
const TradeAgreement = require('../models/TradeAgreement');

// Ahora se usa Op.or directamente (estándar de Sequelize)
const { Op } = require('sequelize');
const path = require('path');

// ======================= FUNCIÓN: CREAR SALA DE CHAT =======================

const createRoom = async (req, res) => {
  // Extrae los datos del cuerpo de la petición
  const { user1Id, user2Id, productId } = req.body;

  // Validación: verifica que todos los campos requeridos estén presentes
  if (!user1Id || !user2Id || !productId) {
    return res.status(400).json({ message: 'Faltan datos requeridos.' });
  }

  try {
    // Validar que los usuarios existan en la base de datos
    const user1 = await User.findByPk(user1Id);
    const user2 = await User.findByPk(user2Id);
    const product = await Products.findByPk(productId);

    // Si alguno no existe, retorna error 404
    if (!user1 || !user2 || !product) {
      return res.status(404).json({ message: 'Usuario o producto no encontrado.' });
    }

    // Buscar si ya existe una sala con esta combinación exacta
    // Esto evita crear salas duplicadas para el mismo par de usuarios y producto
    let chatRoom = await ChatRoom.findOne({
      where: {
        [Op.or]: [
          { user1Id, user2Id },
          { user1Id: user2Id, user2Id: user1Id }
        ]
      }
    });

    // Si no existe, crear una nueva sala
    if (!chatRoom) {
      chatRoom = await ChatRoom.create({ user1Id, user2Id, productId });
    } else {
      // Si la sala existe pero fue eliminada (por visibilidad), no debe existir en la base de datos
      // Si existe pero ambos campos hidden están llenos, la sala debería haber sido eliminada
      // Si existe y no fue eliminada, pero ambos campos hidden están llenos, eliminamos y creamos una nueva
      if (chatRoom.user1HiddenAt && chatRoom.user2HiddenAt) {
        await Message.destroy({ where: { chatRoomId: chatRoom.id } });
        await TradeAgreement.destroy({ where: { chatRoomId: chatRoom.id } });
        await chatRoom.destroy();
        chatRoom = await ChatRoom.create({ user1Id, user2Id, productId });
      }
    }

    // Retorna la sala (nueva o existente) con código 201 (Created)
    return res.status(201).json({
      chatRoomId: chatRoom.id,
      user1Id: chatRoom.user1Id,
      user2Id: chatRoom.user2Id,
      productId: chatRoom.productId,
      message: 'Sala de chat creada correctamente'
    });
  } catch (error) {
    // Captura cualquier error y retorna 500 (Internal Server Error)
    return res.status(500).json({ message: error.message });
  }
};

const getChatRoom = async (req, res) => {
  // Extrae el ID de la sala desde los parámetros de la URL
  const { id } = req.params;

  try {
    // Busca la sala por Primary Key e incluye datos relacionados
    const chatRoom = await ChatRoom.findByPk(id, {
      include: [
        {
          // ⭐ INCLUDE AÑADIDO: Trae datos completos del primer usuario
          model: User,
          as: 'User1', // Alias definido en las asociaciones (index.js)
          attributes: ['id', 'username', 'email', 'profileImage'] // Solo campos necesarios
        },
        {
          // ⭐ INCLUDE AÑADIDO: Trae datos completos del segundo usuario
          model: User,
          as: 'User2', // Alias definido en las asociaciones (index.js)
          attributes: ['id', 'username', 'email', 'profileImage']
        },
        {
          model: Products,
          as: 'Product', // Alias definido en las asociaciones (index.js)
          attributes: ['id', 'title', 'description', 'priceSwapcoins', 'image1']
        }
      ]
    });

    // Si no se encuentra la sala, retorna error 404
    if (!chatRoom) {
      return res.status(404).json({ message: 'Sala de chat no encontrada.' });
    }

    // Retorna la sala con todos los datos relacionados
    res.status(200).json(chatRoom);
  } catch (error) {
    // ⭐ CAMBIO: Agregado console.error para debugging
    console.error('Error al obtener sala de chat:', error);
    res.status(500).json({ message: error.message });
  }
};


const getUserChatRooms = async (req, res) => {
  // Extrae el userId de los parámetros de la URL
  const { userId } = req.params;
  const { includeHidden } = req.query;

  const numericUserId = Number(userId);

  if (Number.isNaN(numericUserId)) {
    return res.status(400).json({ message: 'userId debe ser numérico.' });
  }

  try {
    const includeHiddenRooms = includeHidden === 'true';

    // Busca todas las salas donde el usuario participe
    const chatRooms = await ChatRoom.findAll({
      where: {
        // Busca salas donde el usuario sea user1Id O user2Id
        [Op.or]: includeHiddenRooms
          ? [
              { user1Id: numericUserId },
              { user2Id: numericUserId }
            ]
          : [
              { user1Id: numericUserId, user1HiddenAt: null },
              { user2Id: numericUserId, user2HiddenAt: null }
            ]
      },
      include: [
        {
          // ⭐ INCLUDE AÑADIDO: Trae datos completos del primer usuario
          model: User,
          as: 'User1', // Alias definido en las asociaciones (index.js)
          attributes: ['id', 'username', 'email', 'profileImage']
        },
        {
          // ⭐ INCLUDE AÑADIDO: Trae datos completos del segundo usuario
          model: User,
          as: 'User2', // Alias definido en las asociaciones (index.js)
          attributes: ['id', 'username', 'email', 'profileImage']
        },
      ]
    });

    // Retorna el array de salas (puede estar vacío si el usuario no tiene salas)
    res.status(200).json(chatRooms);
  } catch (error) {
    // ⭐ CAMBIO: Agregado console.error para debugging
    console.error('Error al obtener salas de chat:', error);
    res.status(500).json({ message: error.message });
  }
};

// ======================= FUNCIÓN: OBTENER HISTORIAL DE MENSAJES =======================

const getMessages = async (req, res) => {
  // Extrae el chatRoomId de los parámetros de la URL
  const { chatRoomId } = req.params;

  try {
    // Busca todos los mensajes de la sala ordenados por fecha de creación
    const messages = await Message.findAll({
      where: { chatRoomId }, // Filtra por ID de sala
      order: [['createdAt', 'ASC']] // Ordena de más antiguo a más reciente (ASC = Ascendente)
    });

    // Retorna el array de mensajes (puede estar vacío si no hay mensajes)
    res.status(200).json(messages);
  } catch (error) {
    // Captura errores y retorna 500
    res.status(500).json({ message: error.message });
  }
};

const toggleChatVisibility = async (req, res) => {
  const { chatRoomId } = req.params;
  const requesterId = req.user?.id ?? req.body?.userId;
  const hiddenInput = req.body?.hidden;

  if (!chatRoomId) {
    return res.status(400).json({ message: 'chatRoomId es requerido.' });
  }

  if (requesterId === undefined || requesterId === null) {
    return res.status(401).json({ message: 'Usuario no autenticado.' });
  }

  const numericChatRoomId = Number(chatRoomId);
  const numericRequesterId = Number(requesterId);

  if (Number.isNaN(numericChatRoomId)) {
    return res.status(400).json({ message: 'chatRoomId debe ser numérico.' });
  }

  if (Number.isNaN(numericRequesterId)) {
    return res.status(400).json({ message: 'userId debe ser numérico.' });
  }

  let shouldHide = true;

  if (hiddenInput !== undefined) {
    if (typeof hiddenInput === 'string') {
      shouldHide = hiddenInput.toLowerCase() !== 'false';
    } else {
      shouldHide = Boolean(hiddenInput);
    }
  }

  try {
    const chatRoom = await ChatRoom.findByPk(numericChatRoomId);

    if (!chatRoom) {
      return res.status(404).json({ message: 'Sala de chat no encontrada.' });
    }

    let fieldName = null;

    if (Number(chatRoom.user1Id) === numericRequesterId) {
      fieldName = 'user1HiddenAt';
    } else if (Number(chatRoom.user2Id) === numericRequesterId) {
      fieldName = 'user2HiddenAt';
    }

    if (!fieldName) {
      return res.status(403).json({ message: 'No tienes permisos para actualizar la visibilidad de esta sala.' });
    }

    // Actualizar el campo de visibilidad del usuario actual
    const updates = { [fieldName]: shouldHide ? new Date() : null };
    await chatRoom.update(updates);
    await chatRoom.reload();

    // Si ambos usuarios han ocultado el chat, eliminar sala, mensajes y acuerdos
    if (chatRoom.user1HiddenAt && chatRoom.user2HiddenAt) {
      try {
        // Eliminar mensajes asociados
        await Message.destroy({ where: { chatRoomId: chatRoom.id } });
        
        // Eliminar acuerdos de intercambio asociados
        await TradeAgreement.destroy({ where: { chatRoomId: chatRoom.id } });
        
        // Eliminar la sala de chat
        await chatRoom.destroy();

        // Emitir evento de Socket.IO para notificar eliminación
        const io = req.app.get('io');
        if (io) {
          io.to(`chat_${chatRoom.id}`).emit('chatDeleted', { chatRoomId: chatRoom.id });
        }

        return res.status(200).json({
          chatRoomId: chatRoom.id,
          deleted: true,
          message: 'Sala y mensajes eliminados porque ambos usuarios ocultaron el chat.'
        });
      } catch (deleteError) {
        console.error('Error eliminando sala y mensajes:', deleteError);
        return res.status(500).json({
          chatRoomId: chatRoom.id,
          deleted: false,
          error: deleteError.message,
          message: 'Error al eliminar sala y mensajes.'
        });
      }
    }

    // Si solo uno de los usuarios ocultó el chat, retornar estado actualizado
    return res.status(200).json({
      chatRoomId: chatRoom.id,
      hidden: shouldHide,
      hiddenAt: chatRoom[fieldName],
      user1HiddenAt: chatRoom.user1HiddenAt,
      user2HiddenAt: chatRoom.user2HiddenAt
    });
  } catch (error) {
    console.error('Error al actualizar visibilidad del chat:', error);
    return res.status(500).json({ message: error.message });
  }
};

const uploadChatImage = async (req, res) => {
  const { chatRoomId } = req.params;
  const requesterId = req.user?.id;
  const caption = req.body?.content;

  if (!chatRoomId) {
    return res.status(400).json({ message: 'chatRoomId es requerido.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Archivo de imagen requerido.' });
  }

  try {
    const numericChatRoomId = Number(chatRoomId);
    const numericRequesterId = Number(requesterId);

    if (!requesterId || Number.isNaN(numericRequesterId)) {
      return res.status(401).json({ message: 'Usuario no autenticado.' });
    }

    const chatRoom = await ChatRoom.findByPk(numericChatRoomId);

    if (!chatRoom) {
      return res.status(404).json({ message: 'Sala de chat no encontrada.' });
    }

    const participants = [chatRoom.user1Id, chatRoom.user2Id]
      .map((participantId) => (participantId !== null && participantId !== undefined ? String(participantId) : null))
      .filter((participantId) => participantId !== null);

    const requesterKey = String(numericRequesterId);

    if (!participants.includes(requesterKey)) {
      const updates = {};

      if (chatRoom.user1Id === null || chatRoom.user1Id === undefined) {
        updates.user1Id = numericRequesterId;
      } else if (chatRoom.user2Id === null || chatRoom.user2Id === undefined) {
        updates.user2Id = numericRequesterId;
      }

      if (Object.keys(updates).length > 0) {
        await chatRoom.update(updates);
      } else {
        return res.status(403).json({ message: 'No tienes permisos para enviar archivos en esta sala.' });
      }
    }

    // Reactivar chat si estaba oculto por el receptor
    const reactivationUpdates = {};
    
    // Si el remitente es user1 y user2 había ocultado el chat, reactivarlo
    if (chatRoom.user1Id === numericRequesterId && chatRoom.user2HiddenAt) {
      reactivationUpdates.user2HiddenAt = null;
    }
    // Si el remitente es user2 y user1 había ocultado el chat, reactivarlo
    else if (chatRoom.user2Id === numericRequesterId && chatRoom.user1HiddenAt) {
      reactivationUpdates.user1HiddenAt = null;
    }
    
    // Aplicar actualizaciones si hay cambios
    if (Object.keys(reactivationUpdates).length > 0) {
      await chatRoom.update(reactivationUpdates);
      console.log(`Chat ${numericChatRoomId} reactivado para el receptor`);
    }

    const relativePath = path.posix.join('uploads', 'chat', req.file.filename);
    const fileUrl = `${req.protocol}://${req.get('host')}/${relativePath}`;

    const message = await Message.create({
      chatRoomId: numericChatRoomId,
      senderId: numericRequesterId,
      type: 'image',
      content: caption || null,
      mediaUrl: fileUrl,
      mediaName: req.file.originalname,
      mediaSize: req.file.size
    });

    const payload = message.get({ plain: true });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${numericChatRoomId}`).emit('newMessage', payload);
    }

    return res.status(201).json(payload);
  } catch (error) {
    console.error('Error al subir imagen de chat:', error);
    return res.status(500).json({ message: error.message });
  }
};

const deleteChat = async (req, res) => {
  const { chatRoomId } = req.params;
  const requesterId = req.user?.id ?? req.body?.userId;

  if (!chatRoomId) {
    return res.status(400).json({ message: 'chatRoomId es requerido.' });
  }

  try {
    const numericChatRoomId = Number(chatRoomId);
    const chatRoom = await ChatRoom.findByPk(numericChatRoomId);

    if (!chatRoom) {
      return res.status(404).json({ message: 'Sala de chat no encontrada.' });
    }

    await Message.destroy({ where: { chatRoomId: numericChatRoomId } });
    await TradeAgreement.destroy({ where: { chatRoomId: numericChatRoomId } });
    await chatRoom.destroy();

    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${numericChatRoomId}`).emit('chatDeleted', { chatRoomId: numericChatRoomId });
    }

    return res.status(200).json({ message: 'Sala de chat eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar chat:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ======================= EXPORTACIONES =======================

module.exports = {
  createRoom,      // POST /chat/create-room
  getMessages,     // GET /chat/messages/:chatRoomId
  getChatRoom,     // GET /chat/rooms/:id
  getUserChatRooms, // GET /chat/user/:userId 
  toggleChatVisibility,
  uploadChatImage,
  deleteChat
};