// ======================= CONTROLADOR: Trade Agreements =======================
/**
 * Gestiona la lógica de aceptación bilateral de intercambios
 * Permite que los usuarios acepten o rechacen intercambios
 * Registra cuando ambos usuarios han aceptado
 */

const TradeAgreement = require('../models/TradeAgreement');
const ChatRoom = require('../models/ChatRoom');

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
    
    // 6. Preparar respuesta con mensajes descriptivos
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
        completedAt: null,
        message: 'Aún no se ha iniciado el proceso de aceptación.'
      });
    }
    
    // Si existe, devolver el estado actual
    return res.status(200).json({
      exists: true,
      chatRoomId: tradeAgreement.chatRoomId,
      user1Accepted: tradeAgreement.user1Accepted,
      user2Accepted: tradeAgreement.user2Accepted,
      tradeCompleted: tradeAgreement.tradeCompleted,
      completedAt: tradeAgreement.completedAt,
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
module.exports = {
  acceptTrade,      // POST /chat/trade/accept
  getTradeStatus,   // GET /chat/trade/status/:chatRoomId
  resetTrade        // POST /chat/trade/reset
};
