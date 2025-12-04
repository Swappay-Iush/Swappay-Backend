

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ChatRoom = sequelize.define('ChatRoom', {

  user1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  user2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'products', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  user1HiddenAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'user1HiddenAt',
  },
  user2HiddenAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'user2HiddenAt',
  }
}, {
  tableName: 'chat_rooms',
  timestamps: true
});

module.exports = ChatRoom;

