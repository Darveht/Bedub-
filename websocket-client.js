
// WebSocket Client para mensajes en tiempo real
import { io } from 'socket.io-client';

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.currentUserId = null;
        this.messageCallbacks = new Map();
        this.statusCallbacks = new Map();
    }

    // Conectar al servidor WebSocket
    connect(userId, token) {
        if (this.socket) {
            this.disconnect();
        }

        this.currentUserId = userId;
        
        // Conectar al servidor Socket.IO (usaremos el mismo puerto del servidor web)
        this.socket = io('/', {
            auth: {
                userId: userId,
                token: token
            },
            transports: ['websocket', 'polling']
        });

        this.setupEventListeners();
        return this.socket;
    }

    // Configurar listeners de eventos
    setupEventListeners() {
        if (!this.socket) return;

        // Conexión establecida
        this.socket.on('connect', () => {
            console.log('WebSocket connected:', this.socket.id);
            this.updateUserStatus('online');
        });

        // Desconexión
        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
            this.updateUserStatus('offline');
        });

        // Nuevo mensaje recibido
        this.socket.on('new_message', (data) => {
            console.log('New message received:', data);
            this.handleNewMessage(data);
        });

        // Estado de usuario actualizado
        this.socket.on('user_status_update', (data) => {
            console.log('User status update:', data);
            this.handleUserStatusUpdate(data);
        });

        // Confirmación de mensaje enviado
        this.socket.on('message_sent', (data) => {
            console.log('Message sent confirmation:', data);
            this.handleMessageSent(data);
        });

        // Usuario está escribiendo
        this.socket.on('user_typing', (data) => {
            console.log('User typing:', data);
            this.handleUserTyping(data);
        });

        // Error de conexión
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });
    }

    // Enviar mensaje
    sendMessage(chatId, recipientId, message, translation = null) {
        if (!this.socket || !this.socket.connected) {
            console.error('Socket not connected');
            return false;
        }

        const messageData = {
            chatId,
            recipientId,
            senderId: this.currentUserId,
            text: message,
            translation,
            timestamp: new Date().toISOString(),
            type: 'text'
        };

        this.socket.emit('send_message', messageData);
        return true;
    }

    // Enviar mensaje de voz
    sendVoiceMessage(chatId, recipientId, audioBlob, duration, translation = null) {
        if (!this.socket || !this.socket.connected) {
            console.error('Socket not connected');
            return false;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const audioData = reader.result.split(',')[1]; // Remove data:audio/webm;base64,
            
            const messageData = {
                chatId,
                recipientId,
                senderId: this.currentUserId,
                audioData,
                duration,
                translation,
                timestamp: new Date().toISOString(),
                type: 'voice'
            };

            this.socket.emit('send_voice_message', messageData);
        };
        
        reader.readAsDataURL(audioBlob);
        return true;
    }

    // Notificar que el usuario está escribiendo
    sendTypingIndicator(chatId, recipientId, isTyping) {
        if (!this.socket || !this.socket.connected) return;

        this.socket.emit('typing_indicator', {
            chatId,
            recipientId,
            senderId: this.currentUserId,
            isTyping
        });
    }

    // Unirse a una sala de chat
    joinChat(chatId) {
        if (!this.socket || !this.socket.connected) return;

        this.socket.emit('join_chat', {
            chatId,
            userId: this.currentUserId
        });
    }

    // Salir de una sala de chat
    leaveChat(chatId) {
        if (!this.socket || !this.socket.connected) return;

        this.socket.emit('leave_chat', {
            chatId,
            userId: this.currentUserId
        });
    }

    // Actualizar estado del usuario
    updateUserStatus(status) {
        if (!this.socket || !this.socket.connected) return;

        this.socket.emit('update_status', {
            userId: this.currentUserId,
            status,
            timestamp: new Date().toISOString()
        });
    }

    // Manejar nuevo mensaje recibido
    handleNewMessage(data) {
        const callback = this.messageCallbacks.get(data.chatId);
        if (callback) {
            callback(data);
        }

        // Notificación del navegador si está permitida
        if ('Notification' in window && Notification.permission === 'granted') {
            if (data.senderId !== this.currentUserId) {
                new Notification(`Nuevo mensaje de ${data.senderName || 'Usuario'}`, {
                    body: data.text,
                    icon: '/favicon.ico'
                });
            }
        }
    }

    // Manejar actualización de estado de usuario
    handleUserStatusUpdate(data) {
        const callback = this.statusCallbacks.get(data.userId);
        if (callback) {
            callback(data);
        }
    }

    // Manejar confirmación de mensaje enviado
    handleMessageSent(data) {
        console.log('Message sent successfully:', data);
        // Aquí puedes actualizar la UI para mostrar que el mensaje fue enviado
    }

    // Manejar indicador de escritura
    handleUserTyping(data) {
        const callback = this.messageCallbacks.get(data.chatId);
        if (callback) {
            callback({
                type: 'typing_indicator',
                ...data
            });
        }
    }

    // Registrar callback para mensajes de un chat específico
    onChatMessage(chatId, callback) {
        this.messageCallbacks.set(chatId, callback);
    }

    // Registrar callback para cambios de estado de usuario
    onUserStatusChange(userId, callback) {
        this.statusCallbacks.set(userId, callback);
    }

    // Eliminar callbacks
    removeChatCallback(chatId) {
        this.messageCallbacks.delete(chatId);
    }

    removeStatusCallback(userId) {
        this.statusCallbacks.delete(userId);
    }

    // Desconectar
    disconnect() {
        if (this.socket) {
            this.updateUserStatus('offline');
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.messageCallbacks.clear();
        this.statusCallbacks.clear();
    }

    // Verificar si está conectado
    isConnected() {
        return this.socket && this.socket.connected;
    }
}

// Exportar instancia singleton
export const websocketClient = new WebSocketClient();
