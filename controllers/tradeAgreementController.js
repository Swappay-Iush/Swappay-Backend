// ======================= CONTROLADOR: Trade Agreements =======================
/**
 * Gestiona la lógica de aceptación bilateral de intercambios
 * Permite que los usuarios acepten o rechacen intercambios
 * Registra cuando ambos usuarios han aceptado
 */

const TradeAgreement = require('../models/TradeAgreement');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');

// ======================= FUNCIÓN: ACEPTAR/RECHAZAR INTERCAMBIO =======================
/**
 * Endpoint: POST /chat/trade/accept
 * Descripción: Registra la aceptación de un usuario al intercambio.
 *              Si ambos usuarios aceptan, marca el intercambio como completado.
 * Body esperado: { chatRoomId, userId }
 * Respuesta: { 
 *   user1Accepted, 
 *   user2Accepted, 
 *   tradeCompleted, 
 *   message,
 *   completedAt (si aplica)
 * }
 */
const acceptTrade = async (req, res) => {
  const { chatRoomId, userId } = req.body;
  
  // Validación de campos requeridos
  if (!chatRoomId || !userId) {
    return res.status(400).json({ message: 'Faltan datos requeridos: chatRoomId y userId.' });
  }
  
  try {
    // 1. Verificar que la sala de chat existe
    const chatRoom = await ChatRoom.findByPk(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Sala de chat no encontrada.' });
    }
    
    // 2. Determinar si el usuario es user1 o user2
    const isUser1 = chatRoom.user1Id === parseInt(userId);
    const isUser2 = chatRoom.user2Id === parseInt(userId);
    
    // Validar que el usuario pertenece a esta sala
    if (!isUser1 && !isUser2) {
      return res.status(403).json({ message: 'El usuario no pertenece a esta sala de chat.' });
    }
    
    // 3. Buscar o crear el acuerdo de intercambio
    let tradeAgreement = await TradeAgreement.findOne({
      where: { chatRoomId }
    });
    
    if (!tradeAgreement) {
      // Crear nuevo acuerdo si no existe
      tradeAgreement = await TradeAgreement.create({
        chatRoomId,
        user1Accepted: false,
        user2Accepted: false,
        tradeCompleted: 'pendiente'
      });
    }
    
    // 4. Actualizar el estado de aceptación del usuario correspondiente
    // Toggle: si ya aceptó, cambia a false (retirar aceptación), si no, a true
    if (isUser1) {
      tradeAgreement.user1Accepted = !tradeAgreement.user1Accepted;
    } else if (isUser2) {
      tradeAgreement.user2Accepted = !tradeAgreement.user2Accepted;
    }
    
    // 5. Guardar (el hook beforeSave actualizará tradeCompleted automáticamente)
    await tradeAgreement.save();
    
    // Nota: Las recompensas por intercambio NO se otorgan aquí.
    // Se otorgarán únicamente cuando el campo `messagesInfo` del
    // acuerdo tenga en su última posición el texto "Intercambio exitoso".
    // Esa lógica se implementa en `updateMessagesInfo` para evitar
    // otorgar los Swappcoins antes de la confirmación final entre usuarios.
    
    // 6. Emitir evento Socket.IO para actualización en tiempo real
    const io = req.app.get('io');
    if (io) {
      // Incluimos los identificadores de los participantes y el actor
      // para que el cliente pueda construir mensajes personalizados.
      const eventData = {
        chatRoomId: tradeAgreement.chatRoomId,
        user1Accepted: tradeAgreement.user1Accepted,
        user2Accepted: tradeAgreement.user2Accepted,
        tradeCompleted: tradeAgreement.tradeCompleted,
        completedAt: tradeAgreement.completedAt,
        user1Id: chatRoom.user1Id,
        user2Id: chatRoom.user2Id,
        actorId: parseInt(userId)
      };
      io.to(`chat_${chatRoomId}`).emit('tradeStatusUpdated', eventData);
      console.log(`📡 Evento tradeStatusUpdated emitido a sala chat_${chatRoomId}`, eventData);
    }
    
    // 7. Preparar respuesta con mensajes descriptivos
    let message = '';
    if (tradeAgreement.tradeCompleted === 'en_proceso') {
      message = '¡Intercambio en proceso! Ambos usuarios han aceptado.';
    } else if (isUser1 && tradeAgreement.user1Accepted) {
      message = 'Usuario 1 ha aceptado. Esperando confirmación del Usuario 2.';
    } else if (isUser2 && tradeAgreement.user2Accepted) {
      message = 'Usuario 2 ha aceptado. Esperando confirmación del Usuario 1.';
    } else if (isUser1 && !tradeAgreement.user1Accepted) {
      message = 'Usuario 1 ha retirado su aceptación.';
    } else if (isUser2 && !tradeAgreement.user2Accepted) {
      message = 'Usuario 2 ha retirado su aceptación.';
    }
    
    return res.status(200).json({
      chatRoomId: tradeAgreement.chatRoomId,
      user1Accepted: tradeAgreement.user1Accepted,
      user2Accepted: tradeAgreement.user2Accepted,
      tradeCompleted: tradeAgreement.tradeCompleted,
      completedAt: tradeAgreement.completedAt,
      message
    });
    
  } catch (error) {
    console.error('Error al procesar aceptación de intercambio:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ======================= FUNCIÓN: OBTENER ESTADO DEL INTERCAMBIO =======================
/**
 * Endpoint: GET /chat/trade/status/:chatRoomId
 * Descripción: Consulta el estado actual del acuerdo de intercambio de una sala.
 *              Devuelve información sobre quién ha aceptado y si está completado.
 * Params: chatRoomId
 * Respuesta: { 
 *   exists (si existe el acuerdo),
 *   user1Accepted, 
 *   user2Accepted, 
 *   tradeCompleted,
 *   completedAt
 * }
 */
const getTradeStatus = async (req, res) => {
  const { chatRoomId } = req.params;
  
  try {
    // Buscar el acuerdo de intercambio
    const tradeAgreement = await TradeAgreement.findOne({
      where: { chatRoomId }
    });
    
    // Si no existe, significa que nadie ha dado click aún
    if (!tradeAgreement) {
      return res.status(200).json({
        exists: false,
        user1Accepted: false,
        user2Accepted: false,
        tradeCompleted: 'pendiente',
        messagesInfo: "En negociación",
        completedAt: null,
        message: 'Aún no se ha iniciado el proceso de aceptación.'
      });
    }

    // Obtener información de la sala para incluir user1Id/user2Id
    const chatRoom = await ChatRoom.findByPk(chatRoomId);

    // Si existe, devolver el estado actual incluyendo ids de participantes
    return res.status(200).json({
      exists: true,
      chatRoomId: tradeAgreement.chatRoomId,
      user1Accepted: tradeAgreement.user1Accepted,
      user2Accepted: tradeAgreement.user2Accepted,
      tradeCompleted: tradeAgreement.tradeCompleted,
      completedAt: tradeAgreement.completedAt,
      messagesInfo: tradeAgreement.messagesInfo,
      user1Id: chatRoom ? chatRoom.user1Id : null,
      user2Id: chatRoom ? chatRoom.user2Id : null,
      createdAt: tradeAgreement.createdAt,
      updatedAt: tradeAgreement.updatedAt
    });
    
  } catch (error) {
    console.error('Error al obtener estado del intercambio:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ======================= FUNCIÓN: RESETEAR ACUERDO =======================
/**
 * Endpoint: POST /chat/trade/reset
 * Descripción: Reinicia el acuerdo de intercambio (útil si quieren empezar de nuevo).
 *              Pone todos los campos en false.
 * Body esperado: { chatRoomId }
 * Respuesta: { message }
 */
const resetTrade = async (req, res) => {
  const { chatRoomId } = req.body;
  
  if (!chatRoomId) {
    return res.status(400).json({ message: 'Se requiere chatRoomId.' });
  }
  
  try {
    const tradeAgreement = await TradeAgreement.findOne({
      where: { chatRoomId }
    });
    
    if (!tradeAgreement) {
      return res.status(404).json({ message: 'No existe acuerdo de intercambio para esta sala.' });
    }
    
    // Resetear todos los campos
    tradeAgreement.user1Accepted = false;
    tradeAgreement.user2Accepted = false;
    tradeAgreement.tradeCompleted = 'pendiente';
    tradeAgreement.completedAt = null;
    
    await tradeAgreement.save();
    
    return res.status(200).json({
      message: 'Acuerdo de intercambio reiniciado correctamente.',
      user1Accepted: false,
      user2Accepted: false,
      tradeCompleted: 'pendiente'
    });
    
  } catch (error) {
    console.error('Error al resetear acuerdo:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ======================= EXPORTACIONES =======================
/**
 * Endpoint: GET /chat/trade/all
 * Descripción: Devuelve todos los acuerdos de intercambio existentes.
 * Respuesta: Array de acuerdos
 */
const getAllTrades = async (req, res) => {
  try {
    // Incluye la sala de chat y los usuarios relacionados
    const tradeAgreements = await TradeAgreement.findAll({
      include: [
        {
          model: ChatRoom,
          as: 'chatRoom',
          attributes: ['id', 'user1Id', 'user2Id'],
          include: [
            {
              model: User,
              as: 'user1',
              attributes: ['id', 'email', 'username', 'address']
            },
            {
              model: User,
              as: 'user2',
              attributes: ['id', 'email', 'username', 'address']
            }
          ]
        }
      ]
    });
    return res.status(200).json(tradeAgreements);
  } catch (error) {
    console.error('Error al obtener todos los acuerdos de intercambio:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ======================= FUNCIÓN: ACTUALIZAR MENSAJES INFO =======================
/**
 * Endpoint: POST /chat/trade/messages
 * Body esperado: { chatRoomId, messagesInfo }
 * Descripción: Actualiza el array de mensajesInfo para el acuerdo de intercambio.
 * Respuesta: { message, messagesInfo }
 */
const updateMessagesInfo = async (req, res) => {
  const { id: chatRoomId } = req.params;
  const { messagesInfo } = req.body;
  if (!chatRoomId || !Array.isArray(messagesInfo)) {
    return res.status(400).json({ message: 'Se requiere chatRoomId y un array de messagesInfo.' });
  }
  try {
    const tradeAgreement = await TradeAgreement.findOne({ where: { chatRoomId } });
    if (!tradeAgreement) {
      return res.status(404).json({ message: 'No existe acuerdo de intercambio para esta sala.' });
    }
    // Acumular mensajes sin duplicados
    const prevMessages = Array.isArray(tradeAgreement.messagesInfo) ? tradeAgreement.messagesInfo : [];
    const newMessages = messagesInfo.filter(msg => !prevMessages.includes(msg));
    tradeAgreement.messagesInfo = [...prevMessages, ...newMessages];
    // Guardar primero el array de mensajes
    await tradeAgreement.save();

    // Logs para depuración
    console.log('updateMessagesInfo - chatRoomId:', chatRoomId);
    console.log('updateMessagesInfo - prevMessages:', prevMessages);
    console.log('updateMessagesInfo - incoming messagesInfo:', messagesInfo);
    console.log('updateMessagesInfo - newMessages filtered:', newMessages);
    console.log('updateMessagesInfo - stored messagesInfo:', tradeAgreement.messagesInfo);

    // Verificar si la última entrada indica intercambio exitoso
    const msgs = Array.isArray(tradeAgreement.messagesInfo) ? tradeAgreement.messagesInfo : [];
    const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;

    // Normalizar y comparar de forma robusta
    const lastMsgNormalized = typeof lastMsg === 'string' ? lastMsg.trim().toLowerCase() : null;
    console.log('updateMessagesInfo - lastMsg:', lastMsg, 'normalized:', lastMsgNormalized);

    // Si el último mensaje es 'intercambio exitoso' y el acuerdo está en 'en_proceso',
    // marcar como completado y otorgar recompensas una sola vez.
    if (lastMsgNormalized === 'intercambio exitoso' && tradeAgreement.tradeCompleted === 'en_proceso') {
      console.log('Intercambio exitoso detectado para chatRoomId:', chatRoomId);
      // Marcar acuerdo como completado
      tradeAgreement.tradeCompleted = 'completado';
      tradeAgreement.completedAt = new Date();
      await tradeAgreement.save();

      // Emitir evento para notificar a ambos clientes que el intercambio pasó a completado
      try {
        const io = req.app.get('io');
        if (io) {
          // Obtener ids de participantes si están disponibles
          const chatRoomForEmit = await ChatRoom.findByPk(chatRoomId);
          io.to(`chat_${chatRoomId}`).emit('tradeStatusUpdated', {
            chatRoomId: tradeAgreement.chatRoomId,
            user1Accepted: tradeAgreement.user1Accepted,
            user2Accepted: tradeAgreement.user2Accepted,
            tradeCompleted: tradeAgreement.tradeCompleted,
            completedAt: tradeAgreement.completedAt,
            user1Id: chatRoomForEmit ? chatRoomForEmit.user1Id : null,
            user2Id: chatRoomForEmit ? chatRoomForEmit.user2Id : null
          });
          console.log('Evento tradeStatusUpdated emitido por updateMessagesInfo para completado');
        }
      } catch (emitErr) {
        console.error('Error al emitir evento tradeStatusUpdated desde updateMessagesInfo:', emitErr);
      }

      // Obtener sala para identificar usuarios
      const chatRoom = await ChatRoom.findByPk(chatRoomId);
      if (chatRoom) {
        const user1 = await User.findByPk(chatRoom.user1Id);
        const user2 = await User.findByPk(chatRoom.user2Id);

        if (user1 && user2) {
          console.log('Otorgando recompensas por intercambio a usuarios', user1.id, user2.id);
          // Incrementar contador de intercambios completados
          user1.completedTrades += 1;
          user2.completedTrades += 1;

          // Primer intercambio → +500 swappcoins
          if (user1.completedTrades === 1) user1.swappcoins += 500;
          if (user2.completedTrades === 1) user2.swappcoins += 500;

          // Tercer intercambio → +2000 swappcoins
          if (user1.completedTrades === 3) user1.swappcoins += 2000;
          if (user2.completedTrades === 3) user2.swappcoins += 2000;

          await user1.save();
          await user2.save();
        } else {
          console.warn('Usuarios no encontrados para otorgar recompensas en chatRoomId:', chatRoomId);
        }
      } else {
        console.warn('ChatRoom no encontrado al intentar otorgar recompensas:', chatRoomId);
      }
    }

    return res.status(200).json({
      message: 'Mensajes actualizados correctamente.',
      messagesInfo: tradeAgreement.messagesInfo
    });
  } catch (error) {
    console.error('Error al actualizar messagesInfo:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ======================= FUNCIÓN: ELIMINAR ACUERDO DE INTERCAMBIO =======================
/**
 * Endpoint: DELETE /chat/trade/:chatRoomId
 * Descripción: Elimina el acuerdo de intercambio según el chatRoomId.
 * Params: chatRoomId
 * Respuesta: { message }
 */
const deleteTrade = async (req, res) => {
  const { chatRoomId } = req.params;
  if (!chatRoomId) {
    return res.status(400).json({ message: 'Se requiere chatRoomId.' });
  }
  try {
    const tradeAgreement = await TradeAgreement.findOne({ where: { chatRoomId } });
    if (!tradeAgreement) {
      return res.status(404).json({ message: 'No existe acuerdo de intercambio para esta sala.' });
    }
    await tradeAgreement.destroy();
    return res.status(200).json({ message: 'Acuerdo de intercambio eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar acuerdo de intercambio:', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  acceptTrade,      // POST /chat/trade/accept
  getTradeStatus,   // GET /chat/trade/status/:chatRoomId
  resetTrade,       // POST /chat/trade/reset
  getAllTrades,      // GET /chat/trade/all
  updateMessagesInfo, 
  deleteTrade // DELETE /chat/trade/:chatRoomId
};
