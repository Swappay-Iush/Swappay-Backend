const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const CartItem = sequelize.define('CartItem', {
  idUser: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  
  itemType: {
    type: DataTypes.ENUM('offer', 'exchange'),
    allowNull: false,
  },
  
  // Para items tipo 'offer'
  idProductOffer: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'ProductOffers', key: 'id' },
    onDelete: 'CASCADE'
  },
  
  // Para items tipo 'exchange'
  idProduct: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'products', key: 'id' },
    onDelete: 'CASCADE'
  },
  
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
}, {
  tableName: 'cart_items',
  timestamps: true // Cambia a true para tener createdAt
});

module.exports = CartItem;