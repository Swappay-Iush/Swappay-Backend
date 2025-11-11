

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
  }
}, {
  tableName: 'chat_rooms',
  timestamps: true
});

module.exports = ChatRoom;

// Asociaciones con User para poder incluir los datos en los includes
const User = require('./User');
ChatRoom.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
ChatRoom.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });
