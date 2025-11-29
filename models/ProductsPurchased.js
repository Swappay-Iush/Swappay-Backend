const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ProductsPurchased = sequelize.define('ProductsPurchased', {
    idBuys: { //Id de la compra
        type: DataTypes.STRING,
        allowNull: false,
    },
    idsProducts: { //Arreglo que almacena los id de cada producto de oferta comprado.
        type: DataTypes.JSON, 
        allowNull: false,
        defaultValue: []
    },
    idsProductsChange: {//Arreglo que almacena los id de cada intercambio comprado.
        type: DataTypes.JSON, 
        allowNull: false,
        defaultValue: []
    },
    totalProducts: { //Total de productos comprados
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    FullPayment: { //Pago total en dinero.
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    FullSwapcoins: { //Pago total en swapcoins
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    idClient: { //Id del cliente que realizo la compra
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

module.exports = ProductsPurchased;