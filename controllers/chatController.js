// ======================= IMPORTACIONES =======================
// Importa el modelo ChatRoom para interactuar con la tabla chat_rooms
const ChatRoom = require('../models/ChatRoom');

// Importa el modelo User para validaciones y asociaciones de usuarios
const User = require('../models/User');

// Importa el modelo Message para gestionar mensajes del chat
const Message = require('../models/Message');

// Importa el modelo Products para validar productos
const Products = require('../models/Products');

// ⭐ CAMBIO AÑADIDO: Importa operadores de Sequelize para consultas avanzadas
// Antes se usaba ChatRoom.sequelize.Op.or que causaba errores
// Ahora se usa Op.or directamente (estándar de Sequelize)
const { Op } = require('sequelize');

// ======================= FUNCIÓN: CREAR SALA DE CHAT =======================
/**
 * Endpoint: POST /chat/create-room
 * Descripción: Crea una nueva sala de chat entre dos usuarios para un producto específico.
 *              Si la sala ya existe, devuelve la existente (evita duplicados).
 * Body esperado: { user1Id, user2Id, productId }
 * Respuesta: { chatRoomId, user1Id, user2Id, productId, message }
 */
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
        user1Id,
        user2Id,
        productId
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


// ======================= FUNCIÓN: OBTENER SALA POR ID =======================
/**
 * Endpoint: GET /chat/rooms/:id
 * Descripción: Obtiene información completa de una sala de chat específica por su ID.
 * Params: id (ID de la sala)
 * Respuesta: Objeto ChatRoom con datos de User1, User2 y Product incluidos
 * ⭐ CAMBIO: Ahora incluye datos relacionados de usuarios y producto
 */
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
          // ⚠️ POSIBLE PROBLEMA: El modelo Products usa 'title' no 'name'
          // Puede causar error 500 si estos atributos no coinciden con la tabla
          model: Products,
          as: 'Product', // Alias definido en las asociaciones (index.js)
          attributes: ['id', 'name', 'price', 'description', 'image']
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

// ======================= FUNCIÓN: OBTENER SALAS DE UN USUARIO =======================
/**
 * Endpoint: GET /chat/user/:userId
 * Descripción: Obtiene todas las salas de chat donde participa un usuario específico.
 *              Busca salas donde el usuario sea user1Id O user2Id.
 * Params: userId (ID del usuario)
 * Respuesta: Array de ChatRoom con datos de User1 y User2 incluidos
 * ⭐ CAMBIO CRÍTICO: Ahora usa Op.or correctamente y incluye datos de usuarios
 */
const getUserChatRooms = async (req, res) => {
  // Extrae el userId de los parámetros de la URL
  const { userId } = req.params;
  
  try {
    // Busca todas las salas donde el usuario participe
    const chatRooms = await ChatRoom.findAll({
      where: {
        // ⭐ CAMBIO CRÍTICO: Usa Op.or (importado arriba) en lugar de ChatRoom.sequelize.Op.or
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
        // ⭐ NOTA: El include de Product fue removido a solicitud del usuario
        // para evitar errores 500 por columnas no coincidentes (name, price, image)
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
/**
 * Endpoint: GET /chat/messages/:chatRoomId
 * Descripción: Obtiene todos los mensajes de una sala específica ordenados cronológicamente.
 * Params: chatRoomId (ID de la sala)
 * Respuesta: Array de mensajes ordenados de más antiguo a más reciente
 * Estado: SIN CAMBIOS (función original)
 */
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

// ======================= EXPORTACIONES =======================
/**
 * Exporta todas las funciones del controlador para ser usadas en chatRoutes.js
 * ⭐ CAMBIOS: Se agregaron getChatRoom y getUserChatRooms a las exportaciones
 */
module.exports = {
  createRoom,      // POST /chat/create-room
  getMessages,     // GET /chat/messages/:chatRoomId
  getChatRoom,     // GET /chat/rooms/:id (⭐ AGREGADO)
  getUserChatRooms // GET /chat/user/:userId (⭐ AGREGADO)
};
