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

// Inicializa asociaciones de modelos
require('./models/index');

// ======================= MODELOS =======================
const User = require('./models/User');
const Products = require('./models/Products');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');
const TradeAgreement = require('./models/TradeAgreement');



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

const ProductsPurchasedRoutes = require("./routes/ProductsPurchasedRoutes");

app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/verification', verificationRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/products', productRoutes);
app.use('/carrito', cartRoutes);
app.use('/product-offer', productOfferRoutes);

app.use('/chat', chatRoutes);
app.use('/chat/trade', tradeAgreementRoutes);

app.use('/products-purchased', ProductsPurchasedRoutes);

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
    socket.on('sendMessage', async ({ chatRoomId, senderId, content, user1Id, user2Id, type = 'text' }) => {
        try {
            const numericChatRoomId = Number(chatRoomId);
            const numericSenderId = Number(senderId);

            if (Number.isNaN(numericChatRoomId) || Number.isNaN(numericSenderId)) {
                console.warn('Identificadores inválidos al enviar mensaje de chat.');
                return;
            }

            // Si la sala no existe, créala (requiere user1Id y user2Id)
            let chatRoom = await ChatRoom.findByPk(numericChatRoomId);
            if (!chatRoom && user1Id && user2Id) {
                chatRoom = await ChatRoom.create({ id: numericChatRoomId, user1Id, user2Id });
            }

            // Reactivar chat si estaba oculto por alguno de los usuarios
            if (chatRoom) {
                const updates = {};
                
                // Si el remitente es user1 y user2 había ocultado el chat, reactivarlo
                if (chatRoom.user1Id === numericSenderId && chatRoom.user2HiddenAt) {
                    updates.user2HiddenAt = null;
                }
                // Si el remitente es user2 y user1 había ocultado el chat, reactivarlo
                else if (chatRoom.user2Id === numericSenderId && chatRoom.user1HiddenAt) {
                    updates.user1HiddenAt = null;
                }
                
                // Aplicar actualizaciones si hay cambios
                if (Object.keys(updates).length > 0) {
                    await chatRoom.update(updates);
                    console.log(`Chat ${numericChatRoomId} reactivado para el receptor`);
                }
            }

            // Guardar el mensaje en la base de datos
            const trimmedContent = typeof content === 'string' ? content.trim() : '';

            if (type !== 'text') {
                type = 'text';
            }

            if (!trimmedContent) {
                console.warn('Mensaje de chat vacío recibido y omitido.');
                return;
            }

            const message = await Message.create({
                chatRoomId: numericChatRoomId,
                senderId: numericSenderId,
                type,
                content: trimmedContent
            });

            const payload = message.get({ plain: true });

            // Emitir el mensaje a todos los sockets en la sala chat_{chatRoomId}
            io.to(`chat_${numericChatRoomId}`).emit('newMessage', payload);
        } catch (err) {
            console.error('Error en sendMessage:', err);
        }
    });
});

// ======================= TAREA PROGRAMADA: BORRAR MENSAJES VIEJOS =======================

cron.schedule('0 0 * * *', async () => {
    try {
        // Calcula la fecha límite: hace 3 días desde ahora
        const limite = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 días en milisegundos
        
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