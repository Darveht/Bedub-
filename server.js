
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Servir archivos estáticos
app.use(express.static('.'));

// Almacenar usuarios conectados
const connectedUsers = new Map();
const userSockets = new Map();

// Configurar Socket.IO
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Autenticación del usuario
    socket.on('authenticate', (data) => {
        const { userId, token } = data;
        
        // Aquí verificarías el token con Firebase Admin SDK
        // Por ahora simulamos la verificación
        
        socket.userId = userId;
        connectedUsers.set(userId, {
            socketId: socket.id,
            isOnline: true,
            lastSeen: new Date()
        });
        userSockets.set(socket.id, userId);
        
        console.log(`Usuario ${userId} autenticado`);
        
        // Notificar a otros usuarios sobre el estado en línea
        socket.broadcast.emit('user_status_update', {
            userId,
            status: 'online',
            timestamp: new Date()
        });
    });

    // Unirse a una sala de chat
    socket.on('join_chat', (data) => {
        const { chatId } = data;
        socket.join(chatId);
        console.log(`Usuario ${socket.userId} se unió al chat ${chatId}`);
    });

    // Salir de una sala de chat
    socket.on('leave_chat', (data) => {
        const { chatId } = data;
        socket.leave(chatId);
        console.log(`Usuario ${socket.userId} salió del chat ${chatId}`);
    });

    // Enviar mensaje de texto
    socket.on('send_message', (data) => {
        const { chatId, recipientId, senderId, text, translation, timestamp } = data;
        
        const messageData = {
            id: Date.now().toString(),
            chatId,
            senderId,
            recipientId,
            text,
            translation,
            timestamp,
            type: 'text'
        };

        // Enviar a todos los usuarios en la sala del chat
        io.to(chatId).emit('new_message', messageData);
        
        // Confirmar al remitente
        socket.emit('message_sent', {
            success: true,
            messageId: messageData.id,
            timestamp: new Date()
        });

        console.log(`Mensaje enviado en chat ${chatId}:`, text);
    });

    // Enviar mensaje de voz
    socket.on('send_voice_message', (data) => {
        const { chatId, recipientId, senderId, audioData, duration, translation, timestamp } = data;
        
        const messageData = {
            id: Date.now().toString(),
            chatId,
            senderId,
            recipientId,
            audioData,
            duration,
            translation,
            timestamp,
            type: 'voice'
        };

        // Enviar a todos los usuarios en la sala del chat
        io.to(chatId).emit('new_message', messageData);
        
        // Confirmar al remitente
        socket.emit('message_sent', {
            success: true,
            messageId: messageData.id,
            timestamp: new Date()
        });

        console.log(`Mensaje de voz enviado en chat ${chatId}`);
    });

    // Indicador de escritura
    socket.on('typing_indicator', (data) => {
        const { chatId, recipientId, isTyping } = data;
        
        socket.to(chatId).emit('user_typing', {
            chatId,
            senderId: socket.userId,
            isTyping,
            timestamp: new Date()
        });
    });

    // Actualizar estado del usuario
    socket.on('update_status', (data) => {
        const { status } = data;
        const userId = socket.userId;
        
        if (connectedUsers.has(userId)) {
            connectedUsers.get(userId).status = status;
            connectedUsers.get(userId).lastSeen = new Date();
        }

        // Notificar a otros usuarios
        socket.broadcast.emit('user_status_update', {
            userId,
            status,
            timestamp: new Date()
        });
    });

    // Desconexión
    socket.on('disconnect', () => {
        const userId = userSockets.get(socket.id);
        
        if (userId) {
            console.log(`Usuario ${userId} desconectado`);
            
            // Actualizar estado a offline
            if (connectedUsers.has(userId)) {
                connectedUsers.get(userId).isOnline = false;
                connectedUsers.get(userId).lastSeen = new Date();
            }
            
            // Notificar a otros usuarios
            socket.broadcast.emit('user_status_update', {
                userId,
                status: 'offline',
                timestamp: new Date()
            });
            
            userSockets.delete(socket.id);
        }
        
        console.log('Usuario desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});
