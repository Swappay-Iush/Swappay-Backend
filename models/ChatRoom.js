
// ======================= MODELO: ChatRoom =======================
/**
 * Representa una sala de chat entre dos usuarios sobre un producto específico
 * Tabla en BD: chat_rooms
 * 
 * Relaciones:
 *   - Pertenece a User (user1Id) -> Usuario 1 de la conversación
 *   - Pertenece a User (user2Id) -> Usuario 2 de la conversación
 *   - Pertenece a Products (productId) -> Producto sobre el que se conversa
 * 
 * Las asociaciones están definidas en index.js (líneas 19-33)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ChatRoom = sequelize.define('ChatRoom', {
  // ======================= COLUMNA: user1Id =======================
  /**
   * ID del primer usuario en la conversación
   * Tipo: INTEGER
   * Obligatorio: Sí (allowNull: false)
   * Relación: FK a users.id
   * CASCADE: Si se elimina/actualiza el usuario, se elimina/actualiza la sala
   */
  user1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // ======================= COLUMNA: user2Id =======================
  /**
   * ID del segundo usuario en la conversación
   * Configuración idéntica a user1Id
   */
  user2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  // ======================= COLUMNA: productId =======================
  /**
   * ID del producto sobre el que se está conversando
   * Tipo: INTEGER
   * Relación: FK a products.id
   */
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'products', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
}, {
  tableName: 'chat_rooms',
  timestamps: true
});

module.exports = ChatRoom;
