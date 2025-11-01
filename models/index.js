const User = require('./User');           // Modelo de usuarios
const Products = require('./Products');   // Modelo de productos
const ProductOffer = require('./ProductOffer'); // Modelo de ofertas de productos
const ChatRoom = require('./ChatRoom');   // Modelo de sala de chat

//Asociaciones

// Un usuario puede tener muchos productos
User.hasMany(Products, { foreignKey: 'idUser', as: 'products' });

// Un producto pertenece a un usuario
Products.belongsTo(User, { foreignKey: 'idUser', as: 'user', onDelete: "CASCADE" });

// Un usuario puede tener muchas ofertas de productos
User.hasMany(ProductOffer, { foreignKey: 'idUser', as: 'offers', onDelete: "CASCADE" });

// Una oferta de producto pertenece a un usuario
ProductOffer.belongsTo(User, { foreignKey: 'idUser', as: 'offerOwner', onDelete: "CASCADE" });

// ChatRoom pertenece a User como user1 y user2
ChatRoom.belongsTo(User, { foreignKey: 'user1Id', as: 'User1' });
ChatRoom.belongsTo(User, { foreignKey: 'user2Id', as: 'User2' });

// ChatRoom pertenece a Products como Product
ChatRoom.belongsTo(Products, { foreignKey: 'productId', as: 'Product' });

module.exports = { User, Products, ProductOffer, ChatRoom };
