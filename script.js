// Aplicación EZTranslate sin dependencias externas
class EZTranslateApp {
    constructor() {
        this.currentUser = null;
        this.currentChat = null;
        this.contacts = new Map();
        this.messages = new Map();
        this.currentSlide = 0;
        this.maxSlides = 4;

        // App state
        this.appState = 'auth'; // auth, tutorial, main

        // Voice recording state
        this.isVoiceRecording = false;
        this.speechRecognition = null;

        // Mock verification code for testing
        this.mockVerificationCode = '123456';

        // Initialize app
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.setupVerificationInput();
        this.loadMockData();
        this.requestNotificationPermission();
        this.checkExistingAuth();
    }

    // Verificar si el usuario ya está autenticado
    checkExistingAuth() {
        const isAuthenticated = localStorage.getItem('userAuthenticated');
        const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');

        if (isAuthenticated === 'true') {
            // Usuario ya autenticado, ir directo a la app
            document.getElementById('authContainer').classList.add('hidden');

            if (hasSeenTutorial === 'true') {
                const mainApp = document.getElementById('mainApp');
                if (mainApp) {
                    mainApp.classList.remove('hidden');
                }
                this.appState = 'main';
                this.loadUserData();
            } else {
                const tutorialContainer = document.getElementById('tutorialContainer');
                if (tutorialContainer) {
                    tutorialContainer.classList.remove('hidden');
                }
                this.appState = 'tutorial';
            }
        }
    }

    // Cargar datos del usuario desde localStorage
    loadUserData() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        } else {
            // Datos por defecto
            this.currentUser = {
                uid: 'user_' + Date.now(),
                phone: localStorage.getItem('userPhone') || '+1234567890',
                name: 'Usuario',
                language: localStorage.getItem('userLanguage') || 'es'
            };
            localStorage.setItem('userData', JSON.stringify(this.currentUser));
        }
    }

    // Solicitar permisos de notificación
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then((permission) => {
                console.log('Notification permission:', permission);
            });
        }
    }

    setupEventListeners() {
        // Phone input formatting
        const phoneInput = document.getElementById('phoneNumber');
        if (phoneInput) {
            phoneInput.addEventListener('input', this.formatPhoneNumber.bind(this));
        }

        // Message input - old implementation
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // New message input
        const newMessageInput = document.getElementById('messageTextInput');
        if (newMessageInput) {
            newMessageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendNewMessage();
                }
            });
        }

        // Translator input
        const sourceText = document.getElementById('sourceText');
        if (sourceText) {
            sourceText.addEventListener('input', (e) => {
                const text = e.target.value;
                if (text.trim()) {
                    this.translateText(text, 
                        document.getElementById('fromLanguage').value,
                        document.getElementById('toLanguage').value
                    ).then(translation => {
                        document.getElementById('translatedText').value = translation;
                    });
                } else {
                    document.getElementById('translatedText').value = '';
                }
            });
        }

        // Language selector change events
        const fromLanguage = document.getElementById('fromLanguage');
        const toLanguage = document.getElementById('toLanguage');
        if (fromLanguage && toLanguage) {
            fromLanguage.addEventListener('change', () => {
                const text = document.getElementById('sourceText').value;
                if (text.trim()) {
                    this.translateText(text, fromLanguage.value, toLanguage.value)
                        .then(translation => {
                            document.getElementById('translatedText').value = translation;
                        });
                }
            });

            toLanguage.addEventListener('change', () => {
                const text = document.getElementById('sourceText').value;
                if (text.trim()) {
                    this.translateText(text, fromLanguage.value, toLanguage.value)
                        .then(translation => {
                            document.getElementById('translatedText').value = translation;
                        });
                }
            });
        }

        // Tutorial indicators
        const indicators = document.querySelectorAll('.indicator');
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });
    }

    setupVerificationInput() {
        const codeInputs = document.querySelectorAll('.code-digit');
        codeInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                }
                if (value === '' && index > 0) {
                    codeInputs[index - 1].focus();
                }

                // Auto verify when all digits filled
                const allFilled = Array.from(codeInputs).every(input => input.value);
                if (allFilled) {
                    setTimeout(() => this.verifyCode(), 500);
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    codeInputs[index - 1].focus();
                }
            });
        });
    }

    formatPhoneNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) value = value.slice(0, 10);

        if (value.length >= 6) {
            value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
        } else if (value.length >= 3) {
            value = `${value.slice(0, 3)}-${value.slice(3)}`;
        }

        e.target.value = value;
    }

    // ============ AUTH FUNCTIONS (SIN FIREBASE) ============
    async sendVerificationCode() {
        const phoneInput = document.getElementById('phoneNumber');
        const countryCode = document.getElementById('countryCode').value;
        const language = document.getElementById('preferredLanguage').value;

        if (!phoneInput) {
            console.error('Phone input element not found');
            this.showAlert('Error: No se encontró el campo de teléfono');
            return;
        }

        const phoneNumber = phoneInput.value;
        console.log('Valor del input:', phoneNumber);

        if (!phoneNumber || phoneNumber.trim() === '') {
            this.showAlert('Por favor ingresa tu número de teléfono');
            return;
        }

        // Limpiar y validar número
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        console.log('Número limpio:', cleanPhone);

        if (cleanPhone.length < 10) {
            this.showAlert('Número de teléfono demasiado corto (mínimo 10 dígitos)');
            return;
        }

        const fullPhone = countryCode + cleanPhone;
        console.log('Número completo a enviar:', fullPhone);

        this.showLoading('Enviando código SMS...');

        try {
            // Simular envío de SMS
            await this.delay(2000);

            document.getElementById('phoneDisplay').textContent = fullPhone;
            localStorage.setItem('userLanguage', language);
            localStorage.setItem('userPhone', fullPhone);
            this.hideLoading();
            this.switchToVerification();
            this.showAlert(`¡Código enviado! Usa: ${this.mockVerificationCode}`);
            console.log('Código de prueba:', this.mockVerificationCode);

        } catch (error) {
            this.hideLoading();
            console.error('Error completo:', error);
            this.showAlert('Error al enviar código SMS');
        }
    }

    switchToVerification() {
        document.getElementById('phoneForm').classList.add('hidden');
        document.getElementById('verificationForm').classList.remove('hidden');
        document.getElementById('authTitle').textContent = 'Verificación';
        document.getElementById('authSubtitle').textContent = 'Ingresa el código que enviamos a tu teléfono';
    }

    changePhone() {
        document.getElementById('verificationForm').classList.add('hidden');
        document.getElementById('phoneForm').classList.remove('hidden');
        document.getElementById('authTitle').textContent = 'Bienvenido';
        document.getElementById('authSubtitle').textContent = 'Comunícate sin barreras lingüísticas';

        // Clear code inputs
        document.querySelectorAll('.code-digit').forEach(input => input.value = '');
    }

    async verifyCode() {
        const codeInputs = document.querySelectorAll('.code-digit');
        const code = Array.from(codeInputs).map(input => input.value).join('');

        if (code.length !== 6) {
            this.showAlert('Por favor ingresa el código completo');
            return;
        }

        this.showLoading('Verificando...');

        try {
            // Simular verificación (en lugar de Firebase)
            await this.delay(1500);

            if (code === this.mockVerificationCode) {
                // Crear usuario mock
                this.currentUser = {
                    uid: 'user_' + Date.now(),
                    phone: localStorage.getItem('userPhone'),
                    name: 'Usuario',
                    language: localStorage.getItem('userLanguage') || 'es'
                };

                // Guardar información de sesión
                localStorage.setItem('userAuthenticated', 'true');
                localStorage.setItem('userId', this.currentUser.uid);
                localStorage.setItem('userData', JSON.stringify(this.currentUser));

                this.hideLoading();

                // Si es primera vez, mostrar tutorial, si no ir directo a la app
                const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
                if (hasSeenTutorial === 'true') {
                    this.startApp();
                } else {
                    this.startTutorial();
                }
            } else {
                this.hideLoading();
                this.showAlert('Código incorrecto. Usa: ' + this.mockVerificationCode);
                // Limpiar campos de código
                codeInputs.forEach(input => input.value = '');
                codeInputs[0].focus();
            }
        } catch (error) {
            this.hideLoading();
            this.showAlert('Error de verificación. Intenta de nuevo.');
            console.error('Error verifying code:', error);
            // Limpiar campos de código
            codeInputs.forEach(input => input.value = '');
            codeInputs[0].focus();
        }
    }

    async resendCode() {
        this.showLoading('Reenviando código...');
        await this.delay(1000);
        this.hideLoading();
        this.showAlert('Código reenviado: ' + this.mockVerificationCode);
    }

    // ============ TUTORIAL FUNCTIONS ============
    startTutorial() {
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('tutorialContainer').classList.remove('hidden');
        this.appState = 'tutorial';
    }

    nextSlide() {
        if (this.currentSlide < this.maxSlides - 1) {
            this.currentSlide++;
            this.updateSlide();
        }

        if (this.currentSlide === this.maxSlides - 1) {
            document.querySelector('.next-btn').classList.add('hidden');
            document.querySelector('.start-btn').classList.remove('hidden');
        }
    }

    goToSlide(slideIndex) {
        this.currentSlide = slideIndex;
        this.updateSlide();

        if (this.currentSlide === this.maxSlides - 1) {
            document.querySelector('.next-btn').classList.add('hidden');
            document.querySelector('.start-btn').classList.remove('hidden');
        } else {
            document.querySelector('.next-btn').classList.remove('hidden');
            document.querySelector('.start-btn').classList.add('hidden');
        }
    }

    updateSlide() {
        // Hide all slides
        document.querySelectorAll('.tutorial-slide').forEach(slide => {
            slide.classList.remove('active');
        });

        // Show current slide
        document.querySelector(`[data-slide="${this.currentSlide}"]`).classList.add('active');

        // Update indicators
        document.querySelectorAll('.indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentSlide);
        });
    }

    skipTutorial() {
        this.startApp();
    }

    startApp() {
        document.getElementById('tutorialContainer').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        this.appState = 'main';

        // Marcar tutorial como visto
        localStorage.setItem('hasSeenTutorial', 'true');

        // Show placeholder initially
        const chatMain = document.querySelector('.chat-main');
        if (chatMain) {
            chatMain.classList.add('show-placeholder');
        }

        this.renderChatList();
    }

    // ============ NUEVA IMPLEMENTACIÓN DE CHAT ============
    loadMockData() {
        // Initialize with empty state
        this.chatConversations = new Map();
        this.currentActiveChat = null;
        this.isRecordingVoice = false;

        // Initialize sound settings
        this.soundEnabled = true;
        this.createSoundEffects();

        // Load some example contacts for demo
        this.loadExampleContacts();
    }

    loadExampleContacts() {
        // Add some example contacts after a delay to simulate loading
        setTimeout(() => {
            this.addExampleContact('Ana García', '+52 555 123 4567', 'A', 'es');
            this.addExampleContact('John Smith', '+1 555 987 6543', 'J', 'en');
            this.addExampleContact('Marie Dubois', '+33 1 45 67 89 01', 'M', 'fr');
            this.updateChatsList();
        }, 2000);
    }

    addExampleContact(name, phone, avatar, language) {
        const chatId = phone;
        this.chatConversations.set(chatId, {
            id: chatId,
            name: name,
            phone: phone,
            avatar: avatar,
            language: language,
            status: 'En línea',
            messages: [],
            lastMessageTime: new Date()
        });
    }

    createSoundEffects() {
        // Create audio context for sound effects
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create send message sound (short beep)
            this.createSendSound();

            // Create receive message sound (notification)
            this.createReceiveSound();
        } catch (e) {
            console.log('Audio context not supported');
        }
    }

    createSendSound() {
        this.sendSound = () => {
            if (!this.soundEnabled || !this.audioContext) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }

    createReceiveSound() {
        this.receiveSound = () => {
            if (!this.soundEnabled || !this.audioContext) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(900, this.audioContext.currentTime + 0.15);

            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };
    }

    updateChatsList() {
        const chatsList = document.getElementById('chatsList');
        const emptyChats = document.getElementById('emptyChats');

        if (this.chatConversations.size === 0) {
            emptyChats.style.display = 'flex';
            return;
        }

        emptyChats.style.display = 'none';

        // Clear current list
        chatsList.innerHTML = '';

        // Add chat items
        this.chatConversations.forEach((chat, chatId) => {
            const lastMessage = chat.messages[chat.messages.length - 1];

            const chatItem = document.createElement('div');
            chatItem.className = 'chat-list-item';
            chatItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 16px 24px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: background 0.3s ease;
            `;

            chatItem.innerHTML = `
                <div style="
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: #00d4aa;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #000;
                    font-size: 20px;
                    font-weight: 600;
                    margin-right: 16px;
                ">${chat.avatar}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="
                        font-size: 16px;
                        font-weight: 600;
                        color: #000;
                        margin-bottom: 4px;
                    ">${chat.name}</div>
                    <div style="
                        font-size: 14px;
                        color: #666;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">${lastMessage ? (lastMessage.isSent ? 'Tú: ' : '') + lastMessage.text : 'Toca para iniciar conversación'}</div>
                </div>
                <div style="
                    font-size: 12px;
                    color: #999;
                    text-align: right;
                ">${lastMessage ? this.formatTime(lastMessage.timestamp) : ''}</div>
            `;

            chatItem.addEventListener('mouseenter', () => {
                chatItem.style.background = '#f8f9fa';
            });

            chatItem.addEventListener('mouseleave', () => {
                chatItem.style.background = 'transparent';
            });

            chatItem.addEventListener('click', () => {
                this.openChatConversation(chatId);
            });

            chatsList.appendChild(chatItem);
        });
    }

    openChatConversation(chatId) {
        const chat = this.chatConversations.get(chatId);
        if (!chat) return;

        this.currentActiveChat = chatId;

        // Hide chat list and show chat view
        document.getElementById('chatListView').style.display = 'none';
        document.getElementById('chatView').classList.remove('hidden');
        document.getElementById('chatView').style.display = 'flex';

        // Hide bottom navigation
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.style.transform = 'translateY(100%)';
            bottomNav.style.visibility = 'hidden';
            bottomNav.style.opacity = '0';
        }

        // Update chat header
        document.getElementById('currentContactAvatar').textContent = chat.avatar;
        document.getElementById('currentContactName').textContent = chat.name;
        document.getElementById('currentContactStatus').textContent = chat.status;

        // Render messages
        this.renderChatMessages(chatId);

        // Focus message input
        document.getElementById('messageTextInput').focus();
    }

    renderChatMessages(chatId) {
        const chat = this.chatConversations.get(chatId);
        if (!chat) return;

        const messagesArea = document.getElementById('messagesArea');
        messagesArea.innerHTML = '';

        if (chat.messages.length === 0) {
            messagesArea.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    text-align: center;
                    color: #666;
                    flex-direction: column;
                    gap: 16px;
                ">
                    <i class="fas fa-comments" style="font-size: 48px; color: #ddd;"></i>
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: #333;">Inicia una conversación</h3>
                        <p style="margin: 0; color: #666;">Envía un mensaje para comenzar a chatear con ${chat.name}</p>
                    </div>
                </div>
            `;
            return;
        }

        chat.messages.forEach((message, index) => {
            const messageElement = document.createElement('div');
            messageElement.style.cssText = `
                display: flex;
                justify-content: ${message.isSent ? 'flex-end' : 'flex-start'};
                margin-bottom: 16px;
                animation: slideInMessage 0.3s ease;
            `;

            messageElement.innerHTML = `
                <div style="
                    max-width: 70%;
                    padding: 12px 16px;
                    border-radius: 18px;
                    background: ${message.isSent ? '#000' : '#fff'};
                    color: ${message.isSent ? '#fff' : '#000'};
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    position: relative;
                    ${message.isSent ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'}
                ">
                    <div style="
                        font-size: 15px;
                        line-height: 1.4;
                        margin-bottom: 4px;
                    ">${message.text}</div>
                    ${message.translation && !message.isSent ? 
                        `<div style="
                            font-size: 13px;
                            opacity: 0.7;
                            font-style: italic;
                            margin-top: 4px;
                        ">Original: "${message.originalText}"</div>` : ''}
                    <div style="
                        font-size: 11px;
                        opacity: 0.6;
                        text-align: right;
                        margin-top: 4px;
                    ">${this.formatTime(message.timestamp)}</div>
                </div>
            `;

            messagesArea.appendChild(messageElement);
        });

        // Scroll to bottom
        setTimeout(() => {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }, 100);
    }

    async sendNewMessage() {
        const input = document.getElementById('messageTextInput');
        const text = input.value.trim();

        if (!text || !this.currentActiveChat) return;

        const chat = this.chatConversations.get(this.currentActiveChat);
        if (!chat) return;

        // Clear input immediately
        input.value = '';

        // Play send sound
        if (this.sendSound) this.sendSound();

        try {
            // Create message
            const message = {
                id: Date.now().toString(),
                text: text,
                originalText: text,
                translation: await this.translateText(text, this.currentUser?.language || 'es', chat.language),
                isSent: true,
                timestamp: new Date()
            };

            // Add message to chat
            chat.messages.push(message);
            chat.lastMessageTime = new Date();

            // Update UI
            this.renderChatMessages(this.currentActiveChat);
            this.updateChatsList();

            // Simulate response after delay
            setTimeout(() => {
                this.simulateMessageResponse();
            }, 1000 + Math.random() * 2000);

        } catch (error) {
            console.error('Error sending message:', error);
            this.showAlert('Error al enviar mensaje. Intenta de nuevo.');
        }
    }

    async simulateMessageResponse() {
        if (!this.currentActiveChat) return;

        const chat = this.chatConversations.get(this.currentActiveChat);
        if (!chat) return;

        const responses = [
            'That sounds great!',
            'I understand perfectly.',
            'Thanks for the message.',
            'How interesting!',
            'I agree with you.',
            'Tell me more about it.',
            'Could you tell me more?',
            'That\'s really cool!',
            'I see what you mean.',
            'Absolutely right!'
        ];

        const responseText = responses[Math.floor(Math.random() * responses.length)];

        try {
            const response = {
                id: Date.now().toString(),
                text: await this.translateText(responseText, chat.language, this.currentUser?.language || 'es'),
                originalText: responseText,
                translation: true,
                isSent: false,
                timestamp: new Date()
            };

            // Play receive sound
            if (this.receiveSound) this.receiveSound();

            // Add response to chat
            chat.messages.push(response);
            chat.lastMessageTime = new Date();

            // Update UI
            this.renderChatMessages(this.currentActiveChat);
            this.updateChatsList();

        } catch (error) {
            console.error('Error simulating response:', error);
        }
    }

    async translateText(text, fromLang, toLang) {
        if (fromLang === toLang) {
            return text;
        }

        // Fallback mejorado con más traducciones
        const translations = {
            'es-en': {
                'hola': 'hello',
                'como estas': 'how are you',
                'muy bien': 'very well',
                'gracias': 'thanks',
                'que tal': 'how are you doing',
                'adios': 'goodbye',
                'si': 'yes',
                'no': 'no',
                'por favor': 'please',
                'lo siento': 'sorry',
                'buenos dias': 'good morning',
                'buenas tardes': 'good afternoon',
                'buenas noches': 'good night',
                'como te llamas': 'what is your name',
                'me llamo': 'my name is',
                'cuanto cuesta': 'how much does it cost',
                'donde esta': 'where is',
                'que hora es': 'what time is it',
                'te amo': 'i love you',
                'buen trabajo': 'good job',
                'necesito ayuda': 'i need help',
                'donde vives': 'where do you live',
                'que edad tienes': 'how old are you',
                'me gusta': 'i like it',
                'no entiendo': 'i don\'t understand',
                'habla mas despacio': 'speak more slowly',
                'repite por favor': 'please repeat'
            },
            'en-es': {
                'hello': 'hola',
                'how are you': 'como estas',
                'very well': 'muy bien',
                'thanks': 'gracias',
                'goodbye': 'adios',
                'yes': 'si',
                'no': 'no',
                'please': 'por favor',
                'sorry': 'lo siento',
                'good morning': 'buenos dias',
                'good afternoon': 'buenas tardes',
                'good night': 'buenas noches',
                'what is your name': 'como te llamas',
                'my name is': 'me llamo',
                'how much does it cost': 'cuanto cuesta',
                'where is': 'donde esta',
                'what time is it': 'que hora es',
                'i love you': 'te amo',
                'good job': 'buen trabajo',
                'that sounds great': 'eso suena genial',
                'i understand perfectly': 'entiendo perfectamente',
                'thanks for the message': 'gracias por el mensaje',
                'i need help': 'necesito ayuda',
                'where do you live': 'donde vives',
                'how old are you': 'que edad tienes',
                'i like it': 'me gusta',
                'i don\'t understand': 'no entiendo',
                'speak more slowly': 'habla mas despacio',
                'please repeat': 'repite por favor'
            },
            'es-fr': {
                'hola': 'bonjour',
                'gracias': 'merci',
                'adios': 'au revoir',
                'por favor': 's\'il vous plaît',
                'buenos dias': 'bonjour',
                'buenas noches': 'bonne nuit',
                'no entiendo': 'je ne comprends pas'
            },
            'fr-es': {
                'bonjour': 'hola',
                'merci': 'gracias',
                'au revoir': 'adios',
                's\'il vous plaît': 'por favor',
                'bonne nuit': 'buenas noches',
                'je ne comprends pas': 'no entiendo'
            },
            'en-fr': {
                'hello': 'bonjour',
                'thanks': 'merci',
                'goodbye': 'au revoir',
                'please': 's\'il vous plaît',
                'good night': 'bonne nuit',
                'i don\'t understand': 'je ne comprends pas'
            },
            'fr-en': {
                'bonjour': 'hello',
                'merci': 'thanks',
                'au revoir': 'goodbye',
                's\'il vous plaît': 'please',
                'bonne nuit': 'good night',
                'je ne comprends pas': 'i don\'t understand'
            }
        };

        const translationKey = `${fromLang}-${toLang}`;
        const translationMap = translations[translationKey] || {};

        const lowerText = text.toLowerCase();

        // Check for exact matches first
        if (translationMap[lowerText]) {
            return translationMap[lowerText];
        }

        // Check for partial matches
        for (const [original, translated] of Object.entries(translationMap)) {
            if (lowerText.includes(original)) {
                return text.replace(new RegExp(original, 'gi'), translated);
            }
        }

        // Language-specific fallbacks
        const languageNames = {
            'es': 'Español',
            'en': 'English',
            'fr': 'Français',
            'de': 'Deutsch',
            'it': 'Italiano',
            'pt': 'Português',
            'zh': '中文',
            'ja': '日本語',
            'ko': '한국어',
            'ar': 'العربية',
            'ru': 'Русский',
            'hi': 'हिन्दी'
        };

        return `[${languageNames[toLang] || toLang.toUpperCase()}] ${text}`;
    }

    // ============ NAVIGATION FUNCTIONS ============
    switchSection(section) {
        console.log('Switching to section:', section);

        // Hide all sections
        document.querySelectorAll('.section-container').forEach(container => {
            container.classList.remove('active');
            container.classList.add('hidden');
        });

        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected section
        const sectionElement = document.getElementById(section + 'Section');
        console.log('Section element found:', sectionElement);

        if (sectionElement) {
            sectionElement.classList.add('active');
            sectionElement.classList.remove('hidden');
        }

        // Add active class to selected nav item
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item, index) => {
            const sections = ['chats', 'translator', 'calls', 'settings'];
            if (sections[index] === section) {
                item.classList.add('active');
            }
        });

        // Update settings if switching to settings
        if (section === 'settings') {
            this.updateSettingsDisplay();
        }
    }

updateSettingsDisplay() {
        if (this.currentUser) {
            document.getElementById('settingsUserName').textContent = this.currentUser.name;
            document.getElementById('settingsUserPhone').textContent = this.currentUser.phone;
            document.getElementById('settingsUserLanguage').textContent = this.getLanguageDisplay(this.currentUser.language);
        }
    }

    getLanguageDisplay(langCode) {
        const languages = {
            'es': '🇪🇸 Español',
            'en': '🇺🇸 English',
            'fr': '🇫🇷 Français',
            'de': '🇩🇪 Deutsch',
            'it': '🇮🇹 Italiano',
            'pt': '🇧🇷 Português'
        };
        return languages[langCode] || langCode;
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Ahora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;

        return date.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit' 
        });
    }

    showLoading(text = 'Cargando...') {
        let loadingOverlay = document.getElementById('loadingOverlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loadingOverlay';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-size: 18px;
                font-weight: 600;
            `;
            loadingOverlay.innerHTML = `
                <div style="text-align: center;">
                    <div style="width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #00d4aa; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                    <div id="loadingText">${text}</div>
                </div>
            `;

            if (!document.querySelector('#spinnerStyles')) {
                const style = document.createElement('style');
                style.id = 'spinnerStyles';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(loadingOverlay);
        } else {
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.textContent = text;
            }
            loadingOverlay.classList.remove('hidden');
            loadingOverlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.style.display = 'none';
        }
    }

    showAlert(message) {
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #00d4aa;
            color: #000;
            padding: 16px 24px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease;
        `;
        alertDiv.textContent = message;

        if (!document.querySelector('#alertStyles')) {
            const style = document.createElement('style');
            style.id = 'alertStyles';
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    backToChatList() {
        document.getElementById('chatListView').style.display = 'flex';
        document.getElementById('chatView').classList.add('hidden');
        document.getElementById('chatView').style.display = 'none';

        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.style.transform = 'translateY(0)';
            bottomNav.style.visibility = 'visible';
            bottomNav.style.opacity = '1';
        }

        this.currentActiveChat = null;
    }

    renderChatList() {
        // Render existing chats
        this.updateChatsList();
    }

    // ============ VOICE TRANSLATOR FUNCTIONS ============
    swapVoiceLanguages() {
        const fromLang = document.getElementById('voiceFromLanguage');
        const toLang = document.getElementById('voiceToLanguage');

        if (fromLang && toLang) {
            const tempValue = fromLang.value;
            fromLang.value = toLang.value;
            toLang.value = tempValue;
        }
    }

    async toggleVoiceRecording() {
        if (this.isVoiceRecording) {
            this.stopVoiceRecording();
        } else {
            await this.startVoiceRecording();
        }
    }

    async startVoiceRecording() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.isVoiceRecording = true;
            this.updateRecordingUI(true);

            document.getElementById('originalTextContent').textContent = 'Escuchando...';
            document.getElementById('translatedTextContent').textContent = '';

            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.speechRecognition = new SpeechRecognition();

                const fromLang = document.getElementById('voiceFromLanguage').value;
                this.speechRecognition.lang = fromLang;
                this.speechRecognition.continuous = true;
                this.speechRecognition.interimResults = true;

                this.speechRecognition.onresult = async (event) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + ' ';
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    const originalTextEl = document.getElementById('originalTextContent');
                    const translatedTextEl = document.getElementById('translatedTextContent');

                    if (interimTranscript.trim() || finalTranscript.trim()) {
                        const displayText = finalTranscript + interimTranscript;
                        originalTextEl.textContent = displayText.trim();

                        if (displayText.trim()) {
                            const fromLang = document.getElementById('voiceFromLanguage').value.split('-')[0];
                            const toLang = document.getElementById('voiceToLanguage').value.split('-')[0];

                            try {
                                const translation = await this.translateText(displayText.trim(), fromLang, toLang);
                                translatedTextEl.textContent = translation;
                            } catch (error) {
                                translatedTextEl.textContent = 'Error en la traducción';
                            }
                        }
                    }
                };

                this.speechRecognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    this.stopVoiceRecording();
                };

                this.speechRecognition.start();
            } else {
                this.showAlert('El reconocimiento de voz no está disponible en este navegador.');
                this.stopVoiceRecording();
            }

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showAlert('No se pudo acceder al micrófono.');
            this.stopVoiceRecording();
        }
    }

    stopVoiceRecording() {
        this.isVoiceRecording = false;
        this.updateRecordingUI(false);

        if (this.speechRecognition) {
            this.speechRecognition.stop();
            this.speechRecognition = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }

    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('mainRecordBtn');

        if (recordBtn) {
            if (isRecording) {
                recordBtn.classList.add('recording');
                recordBtn.querySelector('.mic-icon i').className = 'fas fa-stop';
            } else {
                recordBtn.classList.remove('recording');
                recordBtn.querySelector('.mic-icon i').className = 'fas fa-microphone';
            }
        }
    }
}

// Initialize app
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new EZTranslateApp();
});

// Global functions for HTML onclick events
function sendVerificationCode() {
    app.sendVerificationCode();
}

function verifyCode() {
    app.verifyCode();
}

function changePhone() {
    app.changePhone();
}

function resendCode() {
    app.resendCode();
}

function nextSlide() {
    app.nextSlide();
}

function skipTutorial() {
    app.skipTutorial();
}

function startApp() {
    app.startApp();
}

function switchSection(section) {
    app.switchSection(section);
}

function backToChatList() {
    app.backToChatList();
}

function sendNewMessage() {
    app.sendNewMessage();
}

function swapVoiceLanguages() {
    app.swapVoiceLanguages();
}

function toggleVoiceRecording() {
    app.toggleVoiceRecording();
}

function showNewChatModal() {
    const modal = document.getElementById('newChatModal');
    modal.classList.remove('hidden');
}

function closeNewChatModal() {
    const modal = document.getElementById('newChatModal');
    modal.classList.add('hidden');
}

function startNewChat(name, phone, avatar) {
    closeNewChatModal();

    if (!app.chatConversations.has(phone)) {
        app.chatConversations.set(phone, {
            id: phone,
            name: name,
            phone: phone,
            avatar: avatar,
            language: 'es',
            status: 'En línea',
            messages: [],
            lastMessageTime: new Date()
        });

        app.updateChatsList();
    }

    app.openChatConversation(phone);
}

function openSettings() {
    app.openSettings();
}

function logout() {
    app.logout();
}

function goBackToChats() {
    app.goBackToChats();
}

// Nuevas funciones para el chat rediseñado
function loadSuggestedContacts() {
    const contactsGrid = document.getElementById('suggestedContacts');
    const mockContacts = [
        { name: 'Carlos Rodríguez', phone: '+34 612 345 678', avatar: 'C' },
        { name: 'María López', phone: '+1 555 987 6543', avatar: 'M' },
        { name: 'David Wilson', phone: '+1 555 246 8135', avatar: 'D' },
        { name: 'Sofia Herrera', phone: '+52 55 1357 9246', avatar: 'S' }
    ];

    contactsGrid.innerHTML = mockContacts.map(contact => `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
        " onclick="startNewChat('${contact.name}', '${contact.phone}', '${contact.avatar}')">
            <div style="
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: #00d4aa;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #000;
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 8px;
            ">${contact.avatar}</div>
            <div style="
                font-size: 14px;
                font-weight: 600;
                color: #000;
                margin-bottom: 4px;
            ">${contact.name}</div>
            <div style="
                font-size: 12px;
                color: #666;
            ">${contact.phone}</div>
        </div>
    `).join('');
}

function backToChatList() {
    // Show chat list and hide chat view
    document.getElementById('chatListView').style.display = 'flex';
    document.getElementById('chatView').classList.add('hidden');
    document.getElementById('chatView').style.display = 'none';

    // Show bottom navigation again
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.transform = 'translateY(0)';
        bottomNav.style.visibility = 'visible';
        bottomNav.style.opacity = '1';
    }

    // Clear current active chat
    app.currentActiveChat = null;
}

function toggleVoiceRecord() {
    if (app.isRecordingVoice) {
        app.stopVoiceRecording();
    } else {
        app.startVoiceRecording();
    }
}

function playOriginalText() {
    app.playOriginalText();
}

function playTranslatedText() {
    app.playTranslatedText();
}

function copyVoiceTranslation() {
    app.copyVoiceTranslation();
}

function shareVoiceTranslation() {
    app.shareVoiceTranslation();
}

function clearVoiceTranslation() {
    app.clearVoiceTranslation();
}

function showCallHistory() {
    app.showCallHistory();
}

function showDialer() {
    app.showDialer();
}

function openDialer() {
    app.openDialer();
}

function addDigit(digit) {
    app.addDigit(digit);
}

function deleteDigit() {
    app.deleteDigit();
}

function makePhoneCall() {
    app.makePhoneCall();
}

function endCall() {
    app.endCall();
}

function toggleMute() {
    app.toggleMute();
}

function toggleSpeaker() {
    app.toggleSpeaker();
}

function showCallKeypad() {
    app.showCallKeypad();
}

function sendDTMF(digit) {
    app.sendDTMF(digit);
}

function makeCall() {
    app.makeCall();
}

function makeVideoCall() {
    app.makeVideoCall();
}

function makeCallFromChat() {
    app.makeCallFromChat();
}

function toggleChatMenu() {
    app.toggleChatMenu();
}