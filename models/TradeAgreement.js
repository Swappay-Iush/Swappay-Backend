// ======================= MODELO: TradeAgreement =======================
/**
 * Gestiona el proceso de aceptación bilateral de intercambios entre usuarios
 * Tabla en BD: trade_agreements
 * 
 * Flujo de aceptación:
 *   1. Usuario 1 da click → user1Accepted cambia a true
 *   2. Usuario 2 da click → user2Accepted cambia a true
 *   3. Si AMBOS están en true → tradeCompleted se actualiza a true automáticamente
 * 
 * Relaciones:
 *   - Pertenece a ChatRoom (chatRoomId) -> Sala de chat asociada
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const TradeAgreement = sequelize.define('TradeAgreement', {
  // ======================= COLUMNA: chatRoomId =======================
  /**
   * ID de la sala de chat asociada a este acuerdo
   * Tipo: INTEGER
   * Único: Sí (cada sala solo tiene un acuerdo)
   * Obligatorio: Sí
   * Relación: FK a chat_rooms.id
   */
  chatRoomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // Una sala solo puede tener un acuerdo de intercambio
    references: {
      model: 'chat_rooms',
      key: 'id',
    },
    onDelete: 'CASCADE', // Si se borra la sala, se borra el acuerdo
    onUpdate: 'CASCADE',
  },
  
  // ======================= COLUMNA: user1Accepted =======================
  /**
   * Estado de aceptación del primer usuario (user1Id de la sala)
   * Tipo: BOOLEAN
   * Default: false
   * true = Usuario 1 aceptó el intercambio
   * false = Usuario 1 no ha aceptado o rechazó
   */
  user1Accepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false, // Por defecto no ha aceptado
  },
  
  // ======================= COLUMNA: user2Accepted =======================
  /**
   * Estado de aceptación del segundo usuario (user2Id de la sala)
   * Tipo: BOOLEAN
   * Default: false
   * true = Usuario 2 aceptó el intercambio
   * false = Usuario 2 no ha aceptado o rechazó
   */
  user2Accepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  
  // ======================= COLUMNA: tradeCompleted =======================
  /**
   * Estado del intercambio
   * Tipo: STRING (ENUM)
   * Default: 'pendiente'
   * Valores posibles:
   *   - 'pendiente': Estado inicial, ninguno o solo uno ha aceptado
   *   - 'en_proceso': Ambos usuarios han aceptado (user1Accepted Y user2Accepted = true)
   * Se actualiza automáticamente según los estados de aceptación
   */
  tradeCompleted: {
    type: DataTypes.ENUM('pendiente', 'en_proceso'),
    allowNull: false,
    defaultValue: 'pendiente',
  },
  
  // ======================= COLUMNA: completedAt =======================
  /**
   * Fecha y hora en que se completó el intercambio (ambos aceptaron)
   * Tipo: DATE
   * Nullable: Sí (solo se llena cuando tradeCompleted = true)
   */
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  }
}, { 
  tableName: 'trade_agreements',
  timestamps: true, // createdAt y updatedAt
  
  // ======================= HOOKS =======================
  /**
   * Hook: Antes de guardar (crear o actualizar)
   * Lógica: 
   *   - Si ambos usuarios aceptaron → tradeCompleted = 'en_proceso'
   *   - Si alguno no ha aceptado → tradeCompleted = 'pendiente'
   */
  hooks: {
    beforeSave: (tradeAgreement) => {
      // Si ambos usuarios aceptaron, cambiar estado a "en_proceso"
      if (tradeAgreement.user1Accepted && tradeAgreement.user2Accepted) {
        tradeAgreement.tradeCompleted = 'en_proceso'; // setter mapea a 1 en BD
        // Solo registrar la fecha la primera vez que pasa a "en_proceso"
        if (!tradeAgreement.completedAt) {
          tradeAgreement.completedAt = new Date();
        }
      } else {
        // Si alguno retiró su aceptación, volver a "pendiente"
        tradeAgreement.tradeCompleted = 'pendiente'; // setter mapea a 0 en BD
        tradeAgreement.completedAt = null;
      }
    }
  }
});

module.exports = TradeAgreement;
