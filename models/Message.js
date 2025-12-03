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
  type: {
    type: DataTypes.ENUM('text', 'image'),
    allowNull: false,
    defaultValue: 'text'
  },
  content: { type: DataTypes.TEXT, allowNull: true },
  mediaUrl: { type: DataTypes.STRING, allowNull: true },
  mediaName: { type: DataTypes.STRING, allowNull: true },
  mediaSize: { type: DataTypes.INTEGER, allowNull: true },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'messages', timestamps: true });

module.exports = Message;
