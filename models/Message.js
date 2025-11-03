const { DataTypes } = require('sequelize');
const sequelize = require('../database');

// Message representa cada mensaje enviado en una conversación
const Message = sequelize.define('Message', {
  chatRoomId: { type: DataTypes.INTEGER, allowNull: false },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  content: { type: DataTypes.TEXT, allowNull: false },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'messages', timestamps: true });

module.exports = Message;
