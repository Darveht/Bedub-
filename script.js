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
        
        // Initialize app
        this.initializeApp();
    }
    
    initializeApp() {
        this.setupEventListeners();
        this.setupVerificationInput();
        this.loadMockData();
    }
    
    setupEventListeners() {
        // Phone input formatting
        const phoneInput = document.getElementById('phoneNumber');
        if (phoneInput) {
            phoneInput.addEventListener('input', this.formatPhoneNumber.bind(this));
        }
        
        // Message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
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
    
    // ============ AUTH FUNCTIONS ============
    async sendVerificationCode() {
        const phoneNumber = document.getElementById('phoneNumber').value;
        const countryCode = document.getElementById('countryCode').value;
        const language = document.getElementById('preferredLanguage').value;
        
        if (!phoneNumber) {
            this.showAlert('Por favor ingresa tu número de teléfono');
            return;
        }
        
        this.showLoading('Enviando código...');
        
        // Simulate API call
        await this.delay(2000);
        
        const fullPhone = countryCode + phoneNumber.replace(/\D/g, '');
        document.getElementById('phoneDisplay').textContent = fullPhone;
        
        this.hideLoading();
        this.switchToVerification();
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
        
        // Simulate verification
        await this.delay(1500);
        
        // Create user object
        this.currentUser = {
            phone: document.getElementById('phoneDisplay').textContent,
            language: document.getElementById('preferredLanguage').value,
            name: 'Usuario'
        };
        
        this.hideLoading();
        this.startTutorial();
    }
    
    async resendCode() {
        this.showLoading('Reenviando código...');
        await this.delay(1000);
        this.hideLoading();
        this.showAlert('Código reenviado exitosamente');
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
        
        // Header removed, no need to update user info there
        
        // Show placeholder initially
        const chatMain = document.querySelector('.chat-main');
        chatMain.classList.add('show-placeholder');
        
        this.renderChatList();
    }
    
    // ============ CHAT FUNCTIONS ============
    loadMockData() {
        // No mock data - start with empty state
        this.contacts = new Map();
        this.messages = new Map();
        
        // Initialize sound settings
        this.soundEnabled = true;
        this.createSoundEffects();
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
    
    renderChatList() {
        const chatList = document.getElementById('chatList');
        const noChat = document.querySelector('.no-chat-selected');
        const chatMain = document.querySelector('.chat-main');
        
        chatList.innerHTML = '';
        
        // Only show placeholder if no contacts AND no active chat
        if (this.contacts.size === 0 && !this.currentChat) {
            if (noChat) {
                noChat.style.display = 'block';
                noChat.classList.remove('hidden');
            }
            chatMain.classList.add('show-placeholder');
        } else {
            // Hide placeholder when we have contacts or active chat
            if (noChat) {
                noChat.style.display = 'none';
                noChat.classList.add('hidden');
            }
            if (!this.currentChat) {
                chatMain.classList.remove('show-placeholder');
            }
        }
        
        this.contacts.forEach((contact, phone) => {
            const messages = this.messages.get(phone) || [];
            const lastMessage = messages[messages.length - 1];
            
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.onclick = () => this.openChat(phone);
            
            chatItem.innerHTML = `
                <div class="chat-item-avatar">${contact.avatar}</div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${contact.name}</div>
                    <div class="chat-item-preview">
                        ${lastMessage ? (lastMessage.sent ? 'Tú: ' : '') + (lastMessage.translation || lastMessage.text) : 'Sin mensajes'}
                    </div>
                </div>
                <div class="chat-item-meta">
                    <div class="chat-item-time">
                        ${lastMessage ? this.formatTime(lastMessage.timestamp) : ''}
                    </div>
                    ${contact.status === 'online' ? '<div class="chat-item-badge">•</div>' : ''}
                </div>
            `;
            
            chatList.appendChild(chatItem);
        });
    }
    
    openChat(phone) {
        this.currentChat = phone;
        const contact = this.contacts.get(phone);
        
        // Update UI for fullscreen chat
        const chatMain = document.querySelector('.chat-main');
        const chatSidebar = document.querySelector('.chat-sidebar');
        const noChat = document.querySelector('.no-chat-selected');
        const activeChat = document.getElementById('activeChat');
        
        // Hide sidebar and show chat
        chatSidebar.classList.add('chat-open');
        chatMain.classList.remove('show-placeholder');
        chatMain.classList.add('active');
        
        // Hide placeholder completely and show active chat
        if (noChat) {
            noChat.style.display = 'none';
            noChat.classList.add('hidden');
        }
        if (activeChat) {
            activeChat.classList.remove('hidden');
            activeChat.style.display = 'flex';
        }
        
        // Update chat header
        document.getElementById('contactName').textContent = contact.name;
        document.getElementById('contactLanguage').textContent = this.getLanguageDisplay(contact.language);
        
        this.renderMessages();
    }
    
    renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '';
        
        const messages = this.messages.get(this.currentChat) || [];
        
        messages.forEach((message, index) => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.sent ? 'sent' : 'received'}`;
            
            // Agregar animación de entrada con delay
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(20px)';
            
            messageDiv.innerHTML = `
                <div class="message-bubble">
                    <div class="message-text">${message.sent ? message.text : message.translation}</div>
                    ${message.translation && !message.sent ? 
                        `<div class="message-translation">Original: "${message.text}"</div>` : ''}
                    <div class="message-time">${this.formatTime(message.timestamp)}</div>
                </div>
            `;
            
            messagesContainer.appendChild(messageDiv);
            
            // Animar entrada del mensaje
            setTimeout(() => {
                messageDiv.style.transition = 'all 0.3s ease';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            }, index * 50);
        });
        
        // Scroll suave al final
        setTimeout(() => {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        }, messages.length * 50 + 100);
    }
    
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();
        
        if (!text || !this.currentChat) return;
        
        // Limpiar input inmediatamente para mejor UX
        messageInput.value = '';
        
        // Mostrar indicador de "enviando"
        this.showTypingIndicator(true);
        
        // Play send sound
        if (this.sendSound) this.sendSound();
        
        const contact = this.contacts.get(this.currentChat);
        
        try {
            const message = {
                text: text,
                translation: await this.translateText(text, this.currentUser.language, contact.language),
                sent: true,
                timestamp: new Date()
            };
            
            // Add to messages
            if (!this.messages.has(this.currentChat)) {
                this.messages.set(this.currentChat, []);
            }
            this.messages.get(this.currentChat).push(message);
            
            // Ocultar indicador de escritura
            this.showTypingIndicator(false);
            
            this.renderMessages();
            this.renderChatList();
            
            // Simulate response with typing indicator
            setTimeout(() => {
                this.showTypingIndicator(true, false); // Mostrar que el otro está escribiendo
                setTimeout(() => this.simulateResponse(), 1500);
            }, 1000);
            
        } catch (error) {
            this.showTypingIndicator(false);
            this.showAlert('Error al enviar mensaje. Intenta de nuevo.');
        }
    }
    
    showTypingIndicator(show, isSending = true) {
        const messagesContainer = document.getElementById('messagesContainer');
        let typingIndicator = document.getElementById('typingIndicator');
        
        if (show) {
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            typingIndicator = document.createElement('div');
            typingIndicator.id = 'typingIndicator';
            typingIndicator.className = `message ${isSending ? 'sent' : 'received'}`;
            typingIndicator.innerHTML = `
                <div class="message-bubble typing-bubble">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <div class="typing-text">${isSending ? 'Enviando...' : 'Escribiendo...'}</div>
                </div>
            `;
            
            messagesContainer.appendChild(typingIndicator);
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        } else {
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }
    }
    
    async simulateResponse() {
        if (!this.currentChat) return;
        
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
        
        const contact = this.contacts.get(this.currentChat);
        const responseText = responses[Math.floor(Math.random() * responses.length)];
        
        try {
            const response = {
                text: responseText,
                translation: await this.translateText(responseText, contact.language, this.currentUser.language),
                sent: false,
                timestamp: new Date()
            };
            
            // Ocultar indicador de escritura
            this.showTypingIndicator(false);
            
            // Play receive sound
            if (this.receiveSound) this.receiveSound();
            
            this.messages.get(this.currentChat).push(response);
            this.renderMessages();
            this.renderChatList();
            
        } catch (error) {
            this.showTypingIndicator(false);
            console.error('Error simulating response:', error);
        }
    }
    
    async translateText(text, fromLang, toLang) {
        if (fromLang === toLang) {
            return text;
        }
        
        // Simulate API delay
        await this.delay(300);
        
        // Enhanced mock translation dictionary
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
                'buen trabajo': 'good job'
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
                'thanks for the message': 'gracias por el mensaje'
            },
            'es-fr': {
                'hola': 'bonjour',
                'gracias': 'merci',
                'adios': 'au revoir',
                'por favor': 's\'il vous plaît'
            },
            'fr-es': {
                'bonjour': 'hola',
                'merci': 'gracias',
                'au revoir': 'adios',
                's\'il vous plaît': 'por favor'
            },
            'en-fr': {
                'hello': 'bonjour',
                'thanks': 'merci',
                'goodbye': 'au revoir',
                'please': 's\'il vous plaît'
            },
            'fr-en': {
                'bonjour': 'hello',
                'merci': 'thanks',
                'au revoir': 'goodbye',
                's\'il vous plaît': 'please'
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
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
    
    goBackToChats() {
        const chatMain = document.querySelector('.chat-main');
        const chatSidebar = document.querySelector('.chat-sidebar');
        const noChat = document.querySelector('.no-chat-selected');
        const activeChat = document.getElementById('activeChat');
        
        // Clear current chat first
        this.currentChat = null;
        
        // Show sidebar and hide active chat
        chatSidebar.classList.remove('chat-open');
        chatMain.classList.remove('active');
        
        // Hide active chat
        if (activeChat) {
            activeChat.classList.add('hidden');
            activeChat.style.display = 'none';
        }
        
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
        alert(message); // In production, use a custom modal
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
        
        // Header has been completely removed, no need for visibility logic
        
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
            // Check for microphone permission first
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
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
    
    
    
    async translateVoiceText(text) {
        const fromLang = document.getElementById('voiceFromLanguage').value.split('-')[0];
        const toLang = document.getElementById('voiceToLanguage').value.split('-')[0];
        
        try {
            // Show translation loading with animation
            const translatedEl = document.getElementById('translatedTextContent');
            translatedEl.innerHTML = '<span style="opacity: 0.6;">Traduciendo<span class="dots">...</span></span>';
            
            // Animate dots
            const dots = translatedEl.querySelector('.dots');
            let dotCount = 0;
            const dotInterval = setInterval(() => {
                dotCount = (dotCount + 1) % 4;
                dots.textContent = '.'.repeat(dotCount);
            }, 300);
            
            const translation = await this.translateText(text, fromLang, toLang);
            
            // Clear dot animation
            clearInterval(dotInterval);
            
            // Show translation with typing effect
            translatedEl.textContent = '';
            await this.typeText(translatedEl, translation);
            
            // Automatically speak the translation after a short delay
            setTimeout(async () => {
                await this.speakText(translation, document.getElementById('voiceToLanguage').value);
            }, 500);
            
        } catch (error) {
            console.error('Translation error:', error);
            document.getElementById('translatedTextContent').textContent = 'Error en la traducción. Intenta de nuevo.';
        }
    }
    
    async typeText(element, text, speed = 30) {
        element.textContent = '';
        for (let i = 0; i < text.length; i++) {
            element.textContent += text.charAt(i);
            await new Promise(resolve => setTimeout(resolve, speed));
        }
    }
    
    async speakText(text, lang) {
        if (!text || !('speechSynthesis' in window)) return;
        
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
            console.error('Speech synthesis error:', error);
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
    
    makeVideoCall() {
        if (this.currentChat) {
            this.showAlert('Iniciando videollamada...');
        }
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
        voiceBtn.style.background = '#ff4757';
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        
        this.recognition.lang = app.currentUser?.language || 'es';
        this.recognition.start();
    }
    
    stopRecording() {
        this.isRecording = false;
        const voiceBtn = document.getElementById('voiceRecordBtn');
        voiceBtn.style.background = '#00d4aa';
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        
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

function makeVideoCall() {
    app.makeVideoCall();
}
