const {DataTypes} = require('sequelize'); //Importamos los tipos de datos de Sequelize.
const sequelize = require('../database'); //Importamos la instancia de Sequelize configurada en database.js

const Products = sequelize.define('Products', { //Definimos el modelo Products con sus atributos y tipos de datos.
    idUser: { //ID del usuario que crea el producto (clave foránea)
        type: DataTypes.INTEGER,
        allowNull: false,
        references:{ //Referencia a la tabla users
            model: 'users', //Nombre de la tabla referenciada
            key: 'id' //Columna referenciada
        }
    },
    title: { //Título del producto
        type: DataTypes.STRING,
        allowNull: false
    },
    description: { //Descripción del producto
        type: DataTypes.STRING,
        allowNull: false
    },
    category: { //Categoría del producto
        type: DataTypes.ENUM('Tecnología', 'Hogar', 'Ropa', 'Deportes', 'Entretenimiento', 'Libros', 'Juguetes'),
        allowNull: false
    },
    condition: { //Condición del producto (nuevo o usado)
        type: DataTypes.ENUM('Nuevo','Reacondicionado','Usado'),
        allowNull: false
    },
    amount: { //Cantidad disponible del producto
        type: DataTypes.INTEGER,
        allowNull: false
    },
    interests: { //Tipo de intercambio (trueque o venta)
        type: DataTypes.STRING,
        allowNull:false
    },
    priceSwapcoins: { //Precio en Swapcoins (si aplica)
        type: DataTypes.STRING,
        allowNull: true
    },
    additionalNotes: { //Notas adicionales sobre el producto
        type: DataTypes.STRING,
        allowNull: false
    },
    ubication: { //Ubicación del producto
        type: DataTypes.STRING,
        allowNull: false,

    },
    deliveryMethod: { //Método de entrega (envío o digital)
        type: DataTypes.ENUM('Envio', 'Digital'),
        allowNull: false
    },
    image1: { //Ruta de la primera imagen del producto
        type: DataTypes.STRING,
        allowNull: false 
    },
    image2: { //Ruta de la segunda imagen del producto
        type: DataTypes.STRING,
        allowNull: true 
    },
    image3: { //Ruta de la tercera imagen del producto
        type: DataTypes.STRING,
        allowNull: true 
    }

}, {
    tableName: 'products', //Nombre de la tabla en la base de datos
});

// Asociación: Un producto pertenece a un usuario
const User = require('./User');
Products.belongsTo(User, { foreignKey: 'idUser', as: 'user', onDelete: 'CASCADE' });

module.exports = Products; //Exportamos el modelo para usarlo en otras partes de la aplicación.