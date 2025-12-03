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

  try {
    // Busca todas las salas donde el usuario participe
    const chatRooms = await ChatRoom.findAll({
      where: {
        // Busca salas donde el usuario sea user1Id O user2Id
        [Op.or]: [
          { user1Id: userId },
          { user2Id: userId }
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

    if (requesterId !== undefined && requesterId !== null) {
      const numericRequesterId = Number(requesterId);
      if (!Number.isNaN(numericRequesterId)) {
        const participants = [chatRoom.user1Id, chatRoom.user2Id]
          .map((participantId) => (participantId !== null && participantId !== undefined ? Number(participantId) : null))
          .filter((participantId) => participantId !== null);

        if (!participants.includes(numericRequesterId)) {
          const requestUser = await User.findByPk(numericRequesterId);

          if (requestUser?.rol === 'admin') {
            console.warn(`Administrador ${numericRequesterId} eliminó chat ${numericChatRoomId}`);
          } else {
            const updates = {};

            if (chatRoom.user1Id === null || chatRoom.user1Id === undefined) {
              updates.user1Id = numericRequesterId;
            } else if (chatRoom.user2Id === null || chatRoom.user2Id === undefined) {
              updates.user2Id = numericRequesterId;
            }

            if (Object.keys(updates).length > 0) {
              await chatRoom.update(updates);
            } else {
              return res.status(403).json({ message: 'No tienes permisos para eliminar esta sala.' });
            }
          }
        }
      }
    }

    const tradeAgreement = await TradeAgreement.findOne({ where: { chatRoomId: numericChatRoomId } });

    if (!tradeAgreement) {
      return res.status(409).json({ message: 'Aún no existe un acuerdo de intercambio para esta sala.' });
    }

    const bothAccepted = tradeAgreement.user1Accepted && tradeAgreement.user2Accepted;
    const hasSuccessMessage = Array.isArray(tradeAgreement.messagesInfo)
      ? tradeAgreement.messagesInfo.some((msg) => typeof msg === 'string' && msg.trim().toLowerCase() === 'intercambio exitoso')
      : false;
    const tradeCompleted = tradeAgreement.tradeCompleted === 'completado';

    if (!(bothAccepted || hasSuccessMessage || tradeCompleted)) {
      return res.status(409).json({
        message: 'Solo se puede eliminar el chat cuando ambos usuarios aceptan el intercambio o el intercambio ha finalizado exitosamente.'
      });
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
  uploadChatImage,
  deleteChat
};