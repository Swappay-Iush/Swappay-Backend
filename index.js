// ======================= CONFIG =======================
require('dotenv').config();

// ======================= IMPORTS =======================
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cron = require('node-cron');
const { Op } = require('sequelize');
const sequelize = require('./database');

// ======================= MODELOS =======================
const User = require('./models/User');
const Products = require('./models/Products');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');
const TradeAgreement = require('./models/TradeAgreement');

// ======================= ASOCIACIONES =======================
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

// Asociación de TradeAgreement con ChatRoom
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
const port = process.env.PORT || 3000;
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
const tradeAgreementRoutes = require('./routes/tradeAgreementRoutes');



app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/verification', verificationRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/products', productRoutes);
app.use('/carrito', cartRoutes);
app.use('/product-offer', productOfferRoutes);

app.use('/chat', chatRoutes);
app.use('/chat/trade', tradeAgreementRoutes);

app.get('/', (req, res) => {
    res.send("Hola desde la API de Swappay.");
});

// ======================= SOCKET.IO CHAT =======================
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, { cors: { origin: true, credentials: true } });

// Hacer io accesible desde los controladores
app.set('io', io);

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);


    socket.on('joinRoom', ({ chatRoomId }) => {
        socket.join(`chat_${chatRoomId}`);
        console.log(`Socket ${socket.id} se unió a sala chat_${chatRoomId}`);
    });


    // ======================= EVENTO: sendMessage =======================
    socket.on('sendMessage', async ({ chatRoomId, senderId, content, user1Id, user2Id }) => {
        try {
            // Si la sala no existe, créala (requiere user1Id y user2Id)
            let chatRoom = await ChatRoom.findByPk(chatRoomId);
            if (!chatRoom && user1Id && user2Id) {
                chatRoom = await ChatRoom.create({ id: chatRoomId, user1Id, user2Id });
            }

            // Guardar el mensaje en la base de datos
            await Message.create({ chatRoomId, senderId, content });

            // Emitir el mensaje a todos los sockets en la sala chat_{chatRoomId}
            io.to(`chat_${chatRoomId}`).emit('newMessage', { chatRoomId, senderId, content });
        } catch (err) {
            console.error('Error en sendMessage:', err);
        }
    });
});

// ======================= TAREA PROGRAMADA: BORRAR MENSAJES VIEJOS =======================

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

httpServer.listen(port, () => {
    console.log(`Servidor y Socket.IO funcionando en puerto ${port}`);
});