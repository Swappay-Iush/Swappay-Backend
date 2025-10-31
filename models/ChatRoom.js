const { DataTypes } = require('sequelize');
const sequelize = require('../database');

// ChatRoom representa una conversación entre dos usuarios
const ChatRoom = sequelize.define('ChatRoom', {
  user1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  user2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
}, { tableName: 'chat_rooms', timestamps: true });

module.exports = ChatRoom;
