const User = require('./User');           // Modelo de usuarios
const Products = require('./Products');   // Modelo de productos
const ProductOffer = require('./ProductOffer'); // Modelo de ofertas de productos

//Asociaciones

// Un usuario puede tener muchos productos
User.hasMany(Products, { foreignKey: 'idUser', as: 'products' });

// Un producto pertenece a un usuario
Products.belongsTo(User, { foreignKey: 'idUser', as: 'owner', onDelete: "CASCADE" });

// Un usuario puede tener muchas ofertas de productos
User.hasMany(ProductOffer, { foreignKey: 'idUser', as: 'offers', onDelete: "CASCADE" });

// Una oferta de producto pertenece a un usuario
ProductOffer.belongsTo(User, { foreignKey: 'idUser', as: 'offerOwner', onDelete: "CASCADE" });

module.exports = { User, Products, ProductOffer };
