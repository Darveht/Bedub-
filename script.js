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

        try {
            // Usar LibreTranslate API para traducción real
            const response = await this.callLibreTranslateAPI(text, fromLang, toLang);
            if (response && response.translatedText) {
                return response.translatedText;
            }
        } catch (error) {
            console.error('Error con LibreTranslate API:', error);
            // Fallback a traducción local en caso de error
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

    // Nueva función para llamar a LibreTranslate API
    async callLibreTranslateAPI(text, fromLang, toLang) {
        try {
            // Mapear códigos de idioma para LibreTranslate
            const langMap = {
                'es': 'es',
                'en': 'en',
                'fr': 'fr',
                'de': 'de',
                'it': 'it',
                'pt': 'pt',
                'zh': 'zh',
                'ja': 'ja',
                'ko': 'ko',
                'ar': 'ar',
                'ru': 'ru',
                'hi': 'hi'
            };

            const sourceLang = langMap[fromLang] || fromLang.split('-')[0];
            const targetLang = langMap[toLang] || toLang.split('-')[0];

            // Usar API pública de LibreTranslate (puedes cambiar la URL)```python
            const apiUrl = 'https://libretranslate.de/translate';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: 'text'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                translatedText: data.translatedText,
                sourceLanguage: sourceLang,
                targetLanguage: targetLang
            };
        } catch (error) {
            console.error('Error en LibreTranslate API:', error);
            throw error;
        }
    }

    // ============ NEW CHAT FUNCTIONS ============
    openNewChatSection() {
        this.switchSection('newChat');
        this.loadPhoneContacts();
        this.setupContactSearch();
    }

    async loadPhoneContacts() {
        const contactsList = document.getElementById('phoneContactsList');

        // Show loading state
        contactsList.innerHTML = `
            <div class="contacts-loading">
                <i class="fas fa-spinner"></i>
                <span>Cargando contactos...</span>
            </div>
        `;

        try {
            // Try to access contacts API (this is limited in web browsers)
            if ('contacts' in navigator && 'ContactsManager' in window) {
                const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
                this.renderPhoneContacts(contacts);
            } else {
                // Fallback to mock contacts for demo purposes
                await this.delay(1000);
                this.renderMockContacts();
            }
        } catch (error) {
            console.log('Contacts API not available, using mock data');
            await this.delay(1000);
            this.renderMockContacts();
        }
    }

    renderMockContacts() {
        const mockContacts = [
            { name: 'Ana García', phone: '+52 555 123 4567', avatar: 'A' },
            { name: 'Carlos Rodríguez', phone: '+34 612 345 678', avatar: 'C' },
            { name: 'María López', phone: '+1 555 987 6543', avatar: 'M' },
            { name: 'Juan Pérez', phone: '+52 55 8765 4321', avatar: 'J' },
            { name: 'Laura Martín', phone: '+34 634 567 890', avatar: 'L' },
            { name: 'David Wilson', phone: '+1 555 246 8135', avatar: 'D' },
            { name: 'Sofia Herrera', phone: '+52 55 1357 9246', avatar: 'S' },
            { name: 'Roberto Silva', phone: '+55 11 9876 5432', avatar: 'R' },
            { name: 'Elena Jiménez', phone: '+34 645 123 789', avatar: 'E' },
            { name: 'Michael Johnson', phone: '+1 555 369 2580', avatar: 'M' }
        ];

        this.renderPhoneContacts(mockContacts);
    }

    renderPhoneContacts(contacts) {
        const contactsList = document.getElementById('phoneContactsList');

        if (!contacts || contacts.length === 0) {
            contactsList.innerHTML = `
                <div class="contacts-empty">
                    <i class="fas fa-address-book"></i>
                    <h4>No hay contactos disponibles</h4>
                    <p>No se pudieron cargar los contactos del teléfono</p>
                </div>
            `;
            return;
        }

        contactsList.innerHTML = contacts.map(contact => `
            <div class="contact-item" data-name="${contact.name.toLowerCase()}" data-phone="${contact.phone}">
                <div class="contact-avatar-img">
                    ${contact.avatar || contact.name.charAt(0).toUpperCase()}
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-phone">${contact.phone}</div>
                </div>
                <div class="contact-actions">
                    <button class="contact-action-btn call-contact-btn" onclick="app.callContact('${contact.phone}')">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="contact-action-btn message-contact-btn" onclick="app.startChatWithContact('${contact.name}', '${contact.phone}')">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupContactSearch() {
        const searchInput = document.getElementById('contactSearchInput');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            this.filterContacts(searchTerm);
        });
    }

    filterContacts(searchTerm) {
        const contactItems = document.querySelectorAll('.contact-item');

        contactItems.forEach(item => {
            const name = item.dataset.name || '';
            const phone = item.dataset.phone || '';

            const matchesSearch = name.includes(searchTerm) || 
                                phone.replace(/\s+/g, '').includes(searchTerm.replace(/\s+/g, ''));

            if (matchesSearch) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    callContact(phone) {
        this.showAlert(`Llamando a ${phone}...`);
        this.switchSection('calls');
        this.showDialer();
        document.getElementById('dialNumber').value = phone.replace(/\s+/g, '');
    }

    startChatWithContact(name, phone) {
        // Create or find existing contact
        if (!this.contacts.has(phone)) {
            this.contacts.set(phone, {
                name: name,
                phone: phone,
                language: 'es', // Default language
                avatar: name.charAt(0).toUpperCase(),
                status: 'offline'
            });
        }

        // Initialize empty messages array if needed
        if (!this.messages.has(phone)) {
            this.messages.set(phone, []);
        }

        // Switch to chats section and open the chat
        this.switchSection('chats');
        this.renderChatList();

        // Small delay to ensure UI is ready
        setTimeout(() => {
            this.openChat(phone);
        }, 100);

        this.showAlert(`Chat iniciado con ${name}`);
    }

    openSettings() {
        this.showAlert('Configuración próximamente disponible');
    }

    logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            localStorage.clear();
            location.reload();
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
            // Create loading overlay if it doesn't exist
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

            // Add spinner animation
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

    goBackToChats() {
        const chatMain = document.querySelector('.chat-main');
        const chatSidebar = document.querySelector('.chat-sidebar');
        const noChat = document.querySelector('.no-chat-selected');
        const activeChat = document.getElementById('activeChat');
        const bottomNav = document.querySelector('.bottom-nav');

        // Clear current chat first
        this.currentChat = null;

        // Show sidebar and hide active chat
        chatSidebar.classList.remove('chat-open');
        chatMain.classList.remove('active');

        // Show bottom navigation again
        if (bottomNav) {
            bottomNav.style.transform = 'translateY(0)';
            bottomNav.style.visibility = 'visible';
            bottomNav.style.opacity = '1';
        }

        // Hide active chat
        if (activeChat) {
            activeChat.classList.add('hidden');
            activeChat.style.display = 'none';
        }

        // Remove active styling from chat items
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show placeholder only if no contacts exist
        if (this.contacts.size === 0) {
            chatMain.classList.add('show-placeholder');
            if (noChat) {
                noChat.style.display = 'block';
                noChat.classList.remove('hidden');
            }
        } else {
            chatMain.classList.remove('show-placeholder');
            if (noChat) {
                noChat.style.display = 'none';
                noChat.classList.add('hidden');
            }
        }
    }

    showAlert(message) {
        // Create a better alert system
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

        // Add animation keyframes
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

    // ============ NAVIGATION FUNCTIONS ============
    switchSection(section) {
        console.log('Switching to section:', section); // Debug log

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
        console.log('Section element found:', sectionElement); // Debug log

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

    // ============ VOICE TRANSLATOR FUNCTIONS ============
    swapVoiceLanguages() {
        const fromLang = document.getElementById('voiceFromLanguage');
        const toLang = document.getElementById('voiceToLanguage');

        // Swap language values
        const tempValue = fromLang.value;
        fromLang.value = toLang.value;
        toLang.value = tempValue;

        // Clear previous translations
        this.clearVoiceTranslation();
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
            // Check for microphone permission and start recording
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 44100,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            this.isVoiceRecording = true;
            this.updateRecordingUI(true);

            // Clear previous content
            document.getElementById('originalTextContent').textContent = '';
            document.getElementById('translatedTextContent').textContent = '';

            // Initialize speech recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.speechRecognition = new SpeechRecognition();

                // Auto-detect language or use selected language
                const fromLang = document.getElementById('voiceFromLanguage').value;
                this.speechRecognition.lang = fromLang;
                this.speechRecognition.continuous = true;
                this.speechRecognition.interimResults = true;
                this.speechRecognition.maxAlternatives = 1;

                this.speechRecognition.onstart = () => {
                    console.log('Speech recognition started');
                };

                this.speechRecognition.onresult = async (event) => {
                    let interimTranscript = '';
                    let finalTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + ' ';
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    // Update original text in real time
                    const originalTextEl = document.getElementById('originalTextContent');
                    const translatedTextEl = document.getElementById('translatedTextContent');

                    // Show real-time text detection
                    if (interimTranscript.trim() || finalTranscript.trim()) {
                        // Display current speech with interim results
                        const displayText = finalTranscript + interimTranscript;
                        originalTextEl.textContent = displayText.trim();

                        // Auto-translate in real time
                        if (displayText.trim()) {
                            const fromLang = document.getElementById('voiceFromLanguage').value.split('-')[0];
                            const toLang = document.getElementById('voiceToLanguage').value.split('-')[0];

                            try {
                                // Mostrar indicador de traducción
                                translatedTextEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traduciendo...';

                                const translation = await this.translateText(displayText.trim(), fromLang, toLang);
                                translatedTextEl.textContent = translation;

                                // Speak translation automatically for final text
                                if (finalTranscript.trim()) {
                                    setTimeout(() => {
                                        this.speakText(translation, document.getElementById('voiceToLanguage').value);
                                    }, 200);
                                }
                            } catch (error) {
                                translatedTextEl.textContent = 'Error en la traducción';
                                console.error('Translation error:', error);
                            }
                        }
                    }
                };

                this.speechRecognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    if (event.error === 'not-allowed') {
                        this.showAlert('Por favor permite el acceso al micrófono en tu navegador.');
                    } else if (event.error === 'no-speech') {
                        // Don't show error for no speech, just continue listening
                        return;
                    } else if (event.error === 'network') {
                        this.showAlert('Error de conexión. Verifica tu internet.');
                    } else {
                        this.showAlert('Error en el reconocimiento de voz: ' + event.error);
                    }
                    this.stopVoiceRecording();
                };

                this.speechRecognition.onend = () => {
                    console.log('Speech recognition ended');
                    if (this.isVoiceRecording) {
                        // Restart recognition if still recording
                        setTimeout(() => {
                            if (this.isVoiceRecording) {
                                try {
                                    this.speechRecognition.start();
                                } catch (e) {
                                    console.error('Error restarting recognition:', e);
                                    this.stopVoiceRecording();
                                }
                            }
                        }, 100);
                    }
                };

                this.speechRecognition.start();
            } else {
                this.showAlert('El reconocimiento de voz no está disponible en este navegador. Usa Chrome o Edge.');
                this.stopVoiceRecording();
            }

        } catch (error) {
            console.error('Error accessing microphone:', error);
            if (error.name === 'NotAllowedError') {
                this.showAlert('Por favor permite el acceso al micrófono en la configuración de tu navegador.');
            } else {
                this.showAlert('No se pudo acceder al micrófono. Verifica los permisos.');
            }
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

        // Cerrar stream de media
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }

    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('mainRecordBtn');

        if (isRecording) {
            recordBtn.classList.add('recording');
            recordBtn.querySelector('.mic-icon i').className = 'fas fa-stop';
        } else {
            recordBtn.classList.remove('recording');
            recordBtn.querySelector('.mic-icon i').className = 'fas fa-microphone';
        }
    }

    async speakText(text, lang) {
        if (!text) return;

        try {
            await this.speakWithBrowserTTS(text, lang);
        } catch (error) {
            console.error('Error en síntesis de voz:', error);
        }
    }

    async speakWithBrowserTTS(text, lang) {
        if (!('speechSynthesis' in window)) return;

        try {
            // Cancel any ongoing speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;

            // Try to find a better voice for the language
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.lang.startsWith(lang.split('-')[0]) && 
                (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.localService === false)
            );

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Browser TTS error:', error);
        }
    }

    async playOriginalText() {
        const text = document.getElementById('originalTextContent').textContent;
        const lang = document.getElementById('voiceFromLanguage').value;

        if (text && text !== 'Presiona el micrófono y comienza a hablar...') {
            await this.speakText(text, lang);
        }
    }

    async playTranslatedText() {
        const text = document.getElementById('translatedTextContent').textContent;
        const lang = document.getElementById('voiceToLanguage').value;

        if (text && text !== 'La traducción aparecerá aquí automáticamente...') {
            await this.speakText(text, lang);
        }
    }

    copyVoiceTranslation() {
        const translatedText = document.getElementById('translatedTextContent').textContent;

        if (translatedText && translatedText !== 'La traducción aparecerá aquí automáticamente...') {
            navigator.clipboard.writeText(translatedText).then(() => {
                this.showAlert('Traducción copiada al portapapeles');
            }).catch(() => {
                this.showAlert('No se pudo copiar la traducción');
            });
        } else {
            this.showAlert('No hay traducción para copiar');
        }
    }

    shareVoiceTranslation() {
        const originalText = document.getElementById('originalTextContent').textContent;
        const translatedText = document.getElementById('translatedTextContent').textContent;

        if (originalText && translatedText && 
            originalText !== 'Presiona el micrófono y comienza a hablar...' &&
            translatedText !== 'La traducción aparecerá aquí automáticamente...') {

            const shareText = `Traducción de Voz BeDub:\n\nOriginal: ${originalText}\nTraducción: ${translatedText}`;

            if (navigator.share) {
                navigator.share({
                    title: 'Traducción de Voz BeDub',
                    text: shareText
                }).catch(() => {
                    navigator.clipboard.writeText(shareText).then(() => {
                        this.showAlert('Traducción copiada para compartir');
                    });
                });
            } else {
                navigator.clipboard.writeText(shareText).then(() => {
                    this.showAlert('Traducción copiada para compartir');
                }).catch(() => {
                    this.showAlert('No se pudo compartir la traducción');
                });
            }
        } else {
            this.showAlert('No hay traducción para compartir');
        }
    }

    clearVoiceTranslation() {
        document.getElementById('originalTextContent').textContent = '';
        document.getElementById('translatedTextContent').textContent = '';
    }

    // ============ CALLS FUNCTIONS ============
    showCallHistory() {
        document.getElementById('callHistory').classList.remove('hidden');
        document.getElementById('dialer').classList.add('hidden');

        // Update active tab
        document.querySelectorAll('.call-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector('[onclick="showCallHistory()"]').classList.add('active');
    }

    showDialer() {
        document.getElementById('callHistory').classList.add('hidden');
        document.getElementById('dialer').classList.remove('hidden');

        // Update active tab
        document.querySelectorAll('.call-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector('[onclick="showDialer()"]').classList.add('active');
    }

    openDialer() {
        this.switchSection('calls');
        this.showDialer();
    }

    addDigit(digit) {
        const dialInput = document.getElementById('dialNumber');
        dialInput.value += digit;
    }

    deleteDigit() {
        const dialInput = document.getElementById('dialNumber');
        dialInput.value = dialInput.value.slice(0, -1);
    }

    makePhoneCall() {
        const number = document.getElementById('dialNumber').value;
        if (number) {
            this.startCall(number);
        } else {
            this.showAlert('Ingresa un número de teléfono');
        }
    }

    startCall(number) {
        // Show active call screen
        const callScreen = document.getElementById('activeCallScreen');
        const callContactName = document.getElementById('callContactName');
        const callContactNumber = document.getElementById('callContactNumber');
        const callStatus = document.getElementById('callStatus');

        callContactName.textContent = `Llamando a ${number}`;
        callContactNumber.textContent = number;
        callStatus.textContent = 'Conectando...';

        callScreen.classList.add('active');
        callScreen.classList.remove('hidden');

        // Play ringtone
        this.playRingtone();

        // Simulate call connection
        setTimeout(() => {
            callStatus.textContent = 'Llamada en curso...';
            this.stopRingtone();
            this.playCallConnectedSound();
        }, 3000);
    }

    endCall() {
        const callScreen = document.getElementById('activeCallScreen');
        callScreen.classList.remove('active');
        callScreen.classList.add('hidden');

        // Stop any sounds
        this.stopRingtone();
        this.playCallEndSound();

        // Reset call controls
        document.getElementById('muteBtn').classList.remove('active');
        document.getElementById('speakerBtn').classList.remove('active');
        document.getElementById('callKeypad').classList.add('hidden');

        // Clear dial number
        document.getElementById('dialNumber').value = '';
    }

    toggleMute() {
        const muteBtn = document.getElementById('muteBtn');
        const icon = muteBtn.querySelector('i');

        if (muteBtn.classList.contains('active')) {
            muteBtn.classList.remove('active');
            icon.className = 'fas fa-microphone';
        } else {
            muteBtn.classList.add('active');
            icon.className = 'fas fa-microphone-slash';
        }
    }

    toggleSpeaker() {
        const speakerBtn = document.getElementById('speakerBtn');
        const icon = speakerBtn.querySelector('i');

        if (speakerBtn.classList.contains('active')) {
            speakerBtn.classList.remove('active');
            icon.className = 'fas fa-volume-up';
        } else {
            speakerBtn.classList.add('active');
            icon.className = 'fas fa-volume-down';
        }
    }

    showCallKeypad() {
        const keypad = document.getElementById('callKeypad');
        keypad.classList.toggle('hidden');
    }

    sendDTMF(digit) {
        // Play DTMF tone
        this.playDTMFTone(digit);
        console.log('DTMF:', digit);
    }

    // Sound effects for calls
    playRingtone() {
        if (!this.audioContext) return;

        this.ringtoneInterval = setInterval(() => {
            // Play ringtone pattern
            this.playTone(440, 0.5, 0.3); // A4 note
            setTimeout(() => {
                this.playTone(349, 0.5, 0.3); // F4 note
            }, 600);
        }, 2000);
    }

    stopRingtone() {
        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }
    }

    playCallConnectedSound() {
        if (!this.audioContext) return;

        // Play ascending tones
        this.playTone(523, 0.1, 0.2); // C5
        setTimeout(() => this.playTone(659, 0.1, 0.2), 100); // E5
        setTimeout(() => this.playTone(784, 0.1, 0.2), 200); // G5
    }

    playCallEndSound() {
        if (!this.audioContext) return;

        // Play descending tones
        this.playTone(659, 0.2, 0.3); // E5
        setTimeout(() => this.playTone(523, 0.2, 0.3), 200); // C5
        setTimeout(() => this.playTone(415, 0.3, 0.3), 400); // G#4
    }

    playDTMFTone(digit) {
        if (!this.audioContext) return;

        const dtmfFreqs = {
            '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
            '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
            '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
            '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
        };

        const freqs = dtmfFreqs[digit];
        if (freqs) {
            this.playDualTone(freqs[0], freqs[1], 0.2, 0.3);
        }
    }

    playTone(frequency, duration, volume = 0.3) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playDualTone(freq1, freq2, duration, volume = 0.3) {
        if (!this.audioContext) return;

        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator1.frequency.setValueAtTime(freq1, this.audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(freq2, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator1.start(this.audioContext.currentTime);
        oscillator2.start(this.audioContext.currentTime);
        oscillator1.stop(this.audioContext.currentTime + duration);
        oscillator2.stop(this.audioContext.currentTime + duration);
    }

    makeCall() {
        if (this.currentChat) {
            this.showAlert('Iniciando llamada...');
            // Switch to calls section and show dialer
            this.switchSection('calls');
            this.showDialer();
            document.getElementById('dialNumber').value = this.currentChat;
        }
    }

    makeCallFromChat() {
        if (this.currentActiveChat) {
            const chat = this.chatConversations.get(this.currentActiveChat);
            if (chat) {
                this.playCallInitSound();
                this.startCallFromChat(chat.name, chat.phone);
            }
        }
    }

    startCallFromChat(contactName, contactPhone) {
        // Show active call screen
        const callScreen = document.getElementById('activeCallScreen');
        const callContactName = document.getElementById('callContactName');
        const callContactNumber = document.getElementById('callContactNumber');
        const callStatus = document.getElementById('callStatus');

        callContactName.textContent = contactName;
        callContactNumber.textContent = contactPhone;
        callStatus.textContent = 'Llamando...';

        callScreen.classList.add('active');
        callScreen.classList.remove('hidden');

        // Play enhanced ringtone
        this.playEnhancedRingtone();

        // Simulate call connection with realistic timing
        setTimeout(() => {
            callStatus.textContent = 'Conectando...';
            this.playCallConnectingSound();
        }, 2000);

        setTimeout(() => {
            callStatus.textContent = 'Llamada en curso...';
            this.stopRingtone();
            this.playCallConnectedSound();
        }, 4000);
    }

    playCallInitSound() {
        if (!this.audioContext) return;

        // Play modern call initiation sound
        const frequencies = [800, 900, 1000];
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, 0.15, 0.2);
            }, index * 100);
        });
    }

    playEnhancedRingtone() {
        if (!this.audioContext) return;

        this.ringtoneInterval = setInterval(() => {
            // Play modern ringtone pattern (like iPhone)
            const melody = [
                { freq: 659, duration: 0.3 }, // E5
                { freq: 698, duration: 0.3 }, // F5
                { freq: 784, duration: 0.6 }, // G5
                { freq: 659, duration: 0.3 }, // E5
                { freq: 523, duration: 0.6 }  // C5
            ];

            melody.forEach((note, index) => {
                setTimeout(() => {
                    this.playTone(note.freq, note.duration, 0.25);
                }, index * 200);
            });
        }, 3000);
    }

    playCallConnectingSound() {
        if (!this.audioContext) return;

        // Play connecting sound (subtle beeps)
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playTone(1000, 0.1, 0.15);
            }, i * 300);
        }
    }

    toggleChatMenu() {
        // Future implementation for chat menu
        this.showAlert('Menú de chat próximamente');
    }

    
}

// Voice recording functionality
class VoiceRecorder {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recognition = null;
        this.initSpeechRecognition();
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('messageInput').value = transcript;
                app.sendMessage();
            };

            this.recognition.onend = () => {
                this.stopRecording();
            };
        }
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        if (!this.recognition) {
            app.showAlert('El reconocimiento de voz no está disponible en este navegador');
            return;
        }

        this.isRecording = true;
        const voiceBtn = document.getElementById('voiceRecordBtn');
        if (voiceBtn) {
            voiceBtn.style.background = '#ff4757';
            voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        }

        this.recognition.lang = app.currentUser?.language || 'es';
        this.recognition.start();
    }

    stopRecording() {
        this.isRecording = false;
        const voiceBtn = document.getElementById('voiceRecordBtn');
        if (voiceBtn) {
            voiceBtn.style.background = '#00d4aa';
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        }

        if (this.recognition) {
            this.recognition.stop();
        }
    }
}

// Initialize app
let app, voiceRecorder;

document.addEventListener('DOMContentLoaded', () => {
    app = new EZTranslateApp();
    voiceRecorder = new VoiceRecorder();

    // Voice recording button
    const voiceBtn = document.getElementById('voiceRecordBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => voiceRecorder.toggleRecording());
    }
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
function showNewChatModal() {
    const modal = document.getElementById('newChatModal');
    modal.classList.remove('hidden');

    // Load suggested contacts
    loadSuggestedContacts();
}

function closeNewChatModal() {
    const modal = document.getElementById('newChatModal');
    modal.classList.add('hidden');
}

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

function startNewChat(name, phone, avatar) {
    // Close modal
    closeNewChatModal();

    // Add new chat if it doesn't exist
    if (!app.chatConversations.has(phone)) {
        app.chatConversations.set(phone, {
            id: phone,
            name: name,
            phone: phone,
            avatar: avatar,
            language: 'es', // Default language
            status: 'En línea',
            messages: [],
            lastMessageTime: new Date()
        });

        app.updateChatsList();
    }

    // Open the chat
    app.openChatConversation(phone);
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

function sendNewMessage() {
    app.sendNewMessage();
}

function toggleVoiceRecord() {
    if (app.isRecordingVoice) {
        app.stopVoiceRecording();
    } else {
        app.startVoiceRecording();
    }
}

function switchSection(section) {
    app.switchSection(section);
}

function swapVoiceLanguages() {
    app.swapVoiceLanguages();
}

function toggleVoiceRecording() {
    app.toggleVoiceRecording();
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



function makeCallFromChat() {
    app.makeCallFromChat();
}

function toggleChatMenu() {
    app.toggleChatMenu();
}
