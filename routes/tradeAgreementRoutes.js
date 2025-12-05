// ======================= RUTAS: Trade Agreements =======================
/**
 * Define las rutas HTTP para gestionar acuerdos de intercambio
 * Prefix: /chat/trade
 */

const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeAgreementController');

// ======================= POST: Aceptar/Rechazar Intercambio =======================
/**
 * POST /chat/trade/accept
 * Body: { chatRoomId, userId }
 * Descripción: Registra que un usuario aceptó el intercambio (toggle)
 *              Si ambos usuarios aceptan, marca el intercambio como completado
 */
router.post('/accept', tradeController.acceptTrade);

// ======================= GET: Consultar Estado del Intercambio =======================
/**
 * GET /chat/trade/status/:chatRoomId
 * Params: chatRoomId
 * Descripción: Obtiene el estado actual del acuerdo (quién aceptó, si está completado)
 */
router.get('/status/:chatRoomId', tradeController.getTradeStatus);

// ======================= POST: Resetear Acuerdo =======================
/**
 * POST /chat/trade/reset
 * Body: { chatRoomId }
 * Descripción: Reinicia el acuerdo (ambos pasan a false)
 */
router.post('/reset', tradeController.resetTrade);

// ======================= GET: Todos los acuerdos =======================
/**
 * GET /chat/trade/all
 * Descripción: Devuelve todos los acuerdos de intercambio existentes
 */
router.post('/messages/:id', tradeController.updateMessagesInfo);
router.get('/all', tradeController.getAllTrades);

// ======================= DELETE: Eliminar Acuerdo =======================
/**
 * DELETE /chat/trade/:chatRoomId
 * Descripción: Elimina el acuerdo de intercambio según el chatRoomId
 */
router.delete('/:chatRoomId', tradeController.deleteTrade);

module.exports = router;
