
// ======================= IMPORTS =======================
const express = require('express');
const sequelize = require('./database');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const { Op } = require('sequelize');

// ======================= MODELOS =======================
/**
 * ⭐ CAMBIO IMPORTANTE: Ahora se asignan a constantes en lugar de solo hacer require()
 * Motivo: Necesitamos las referencias para definir asociaciones de Sequelize
 * Antes: require('./models/ChatRoom'); (sin asignación)
 * Ahora: const ChatRoom = require('./models/ChatRoom'); (con asignación)
 */
const User = require('./models/User');
const Products = require('./models/Products');
const CartItem = require('./models/CartItem');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');
const TradeAgreement = require('./models/TradeAgreement'); // ⭐ NUEVO: Modelo de acuerdos de intercambio

// ======================= ASOCIACIONES =======================
/**
 * ⭐ BLOQUE COMPLETAMENTE NUEVO - CRÍTICO PARA EL FUNCIONAMIENTO
 * Define las relaciones entre modelos usando Sequelize
 * Sin estas asociaciones, los 'include' en las consultas causan errores 500
 */

// Asociaciones de ChatRoom con User (dos veces, porque hay dos usuarios por sala)
ChatRoom.belongsTo(User, { 
  foreignKey: 'user1Id',  // Columna en chat_rooms que referencia a users.id
  as: 'User1'             // Alias para usar en queries: include: { model: User, as: 'User1' }
});

ChatRoom.belongsTo(User, { 
  foreignKey: 'user2Id',  // Columna para el segundo usuario
  as: 'User2'             // Alias diferente para diferenciar ambos usuarios
});

// Asociación de ChatRoom con Products
ChatRoom.belongsTo(Products, { 
  foreignKey: 'productId', // Columna en chat_rooms que referencia a products.id
  as: 'Product'            // Alias para usar en queries: include: { model: Products, as: 'Product' }
});

// ⭐ NUEVO: Asociación de TradeAgreement con ChatRoom
TradeAgreement.belongsTo(ChatRoom, {
  foreignKey: 'chatRoomId', // Columna en trade_agreements que referencia a chat_rooms.id
  as: 'ChatRoom'            // Alias para incluir datos de la sala
});

// Relación inversa: ChatRoom tiene un TradeAgreement
ChatRoom.hasOne(TradeAgreement, {
  foreignKey: 'chatRoomId',
  as: 'TradeAgreement'
});

// ======================= INICIALIZACIÓN APP =======================
const app = express();
const port = 3000;

require('dotenv').config();
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

// ======================= SINCRONIZAR BASE DE DATOS =======================
// Sincroniza modelos
sequelize.sync()
    .then(() => {
        console.log("Modelos Sincronizados.");
    })
    .catch(err => {
        console.error("Error al sincronizar los modelos.", err);
    });

// ======================= RUTAS =======================
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

const productRoutes = require('./routes/productsRoutes');
const cartRoutes = require('./routes/cartRoutes');
const productOfferRoutes = require('./routes/productOfferRoutes');
const chatRoutes = require('./routes/chatRoutes');
const tradeAgreementRoutes = require('./routes/tradeAgreementRoutes'); // ⭐ NUEVO: Rutas de acuerdos de intercambio


app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/verification', verificationRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/products', productRoutes);
app.use('/carrito', cartRoutes);
app.use('/product-offer', productOfferRoutes);
app.use('/chat', chatRoutes);
app.use('/chat/trade', tradeAgreementRoutes); // ⭐ NUEVO: Prefix /chat/trade para acuerdos

app.get('/', (req, res) => {
    res.send("Hola desde la API de Swappay.");
});

// ======================= SOCKET.IO CHAT =======================
/**
 * Configuración de Socket.IO para chat en tiempo real
 * httpServer: Servidor HTTP que combina Express + Socket.IO
 * io: Instancia de Socket.IO con CORS habilitado para el frontend
 */
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, { cors: { origin: true, credentials: true } });


io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // ======================= EVENTO: joinRoom =======================
    /**
     * El cliente emite este evento cuando quiere unirse a una sala de chat
     * Payload esperado: { chatRoomId }
     * Acción: Une el socket a una sala privada identificada como chat_{chatRoomId}
     */
    socket.on('joinRoom', ({ chatRoomId }) => {
        socket.join(`chat_${chatRoomId}`);
        console.log(`Socket ${socket.id} se unió a sala chat_${chatRoomId}`);
    });

    // ======================= EVENTO: sendMessage =======================
    /**
     * El cliente emite este evento cuando envía un mensaje
     * Payload esperado: { chatRoomId, senderId, content, user1Id?, user2Id? }
     * Acción: 
     *   1. Crea la sala si no existe (usando user1Id y user2Id opcionales)
     *   2. Guarda el mensaje en la base de datos
     *   3. Emite 'newMessage' a todos los usuarios en la sala
     */
    socket.on('sendMessage', async ({ chatRoomId, senderId, content, user1Id, user2Id }) => {
        // Nota: Se hace require local de los modelos (podría optimizarse usando las constantes de arriba)
        const ChatRoom = require('./models/ChatRoom');
        const Message = require('./models/Message');
        
        // Si la sala no existe, créala (requiere user1Id y user2Id)
        let chatRoom = await ChatRoom.findByPk(chatRoomId);
        if (!chatRoom && user1Id && user2Id) {
            chatRoom = await ChatRoom.create({ id: chatRoomId, user1Id, user2Id });
        }
        
        // Guardar el mensaje en la base de datos
        await Message.create({ chatRoomId, senderId, content });
        
        // Emitir el mensaje a todos los sockets en la sala chat_{chatRoomId}
        io.to(`chat_${chatRoomId}`).emit('newMessage', { chatRoomId, senderId, content });
    });
});

// ======================= TAREA PROGRAMADA: BORRAR MENSAJES VIEJOS =======================
/**
 * ⭐ CAMBIO CRÍTICO: Se eliminó la declaración duplicada de Message
 * Antes: const Message = require('./models/Message'); (aquí en línea 99)
 * Error: "Identifier 'Message' has already been declared" - ya se importó en línea 17
 * Ahora: Usa el Message importado arriba
 * 
 * Cron job que se ejecuta cada hora (expresión: '0 * * * *')
 * Limpia mensajes con más de 1 hora de antigüedad para liberar espacio en BD
 */
cron.schedule('0 * * * *', async () => {
    try {
        // Calcula la fecha límite: hace 1 hora desde ahora
        const limite = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hora en milisegundos
        
        // Elimina todos los mensajes creados antes de la fecha límite
        const eliminados = await Message.destroy({
            where: {
                createdAt: { [Op.lt]: limite } // Op.lt = "less than" (menor que)
            }
        });
        
        // Log solo si se eliminaron mensajes
        if (eliminados > 0) {
            console.log(`Mensajes eliminados automáticamente: ${eliminados}`);
        }
    } catch (err) {
        console.error('Error eliminando mensajes automáticamente:', err);
    }
});

// ======================= INICIAR SERVIDOR =======================
/**
 * ⚠️ IMPORTANTE: Se usa httpServer.listen() NO app.listen()
 * Razón: httpServer incluye tanto Express como Socket.IO
 * Si se usa app.listen(), Socket.IO no funcionará
 */
httpServer.listen(port, () => {
    console.log(`Servidor y Socket.IO funcionando en puerto ${port}`);
});