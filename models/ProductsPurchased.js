const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ProductsPurchased = sequelize.define('ProductsPurchased', {
    idBuys: { //Id de la compra
        type: DataTypes.STRING,
        allowNull: false,
    },
    idsProducts: { //Arreglo que almacena los id y cantidad de cada producto de oferta comprado.
        type: DataTypes.JSON, 
        allowNull: true,
        defaultValue: [], // Formato: [{ id: 1, quantity: 2 }, { id: 3, quantity: 1 }]
        comment: 'Array de objetos con id y quantity de productos de oferta'
    },
    idsProductsChange: {//Arreglo que almacena los id y cantidad de cada intercambio comprado.
        type: DataTypes.JSON, 
        allowNull: true,
        defaultValue: [], // Formato: [{ id: 5, quantity: 1 }, { id: 8, quantity: 3 }]
        comment: 'Array de objetos con id y quantity de productos de intercambio'
    },
    totalProducts: { //Total de productos comprados (suma de todas las cantidades)
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