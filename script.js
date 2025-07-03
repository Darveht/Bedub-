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
        
        // Set user info
        document.getElementById('userName').textContent = this.currentUser.name;
        
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
        chatList.innerHTML = '';
        
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
        
        chatMain.classList.remove('show-placeholder');
        chatMain.classList.add('active');
        chatSidebar.classList.add('chat-open');
        
        document.querySelector('.no-chat-selected').classList.add('hidden');
        document.getElementById('activeChat').classList.remove('hidden');
        
        // Update chat header
        document.getElementById('contactName').textContent = contact.name;
        document.getElementById('contactLanguage').textContent = this.getLanguageDisplay(contact.language);
        
        this.renderMessages();
    }
    
    renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '';
        
        const messages = this.messages.get(this.currentChat) || [];
        
        messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.sent ? 'sent' : 'received'}`;
            
            messageDiv.innerHTML = `
                <div class="message-bubble">
                    <div class="message-text">${message.sent ? message.text : message.translation}</div>
                    ${message.translation && !message.sent ? 
                        `<div class="message-translation">Original: "${message.text}"</div>` : ''}
                    <div class="message-time">${this.formatTime(message.timestamp)}</div>
                </div>
            `;
            
            messagesContainer.appendChild(messageDiv);
        });
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();
        
        if (!text || !this.currentChat) return;
        
        messageInput.value = '';
        
        // Play send sound
        if (this.sendSound) this.sendSound();
        
        const contact = this.contacts.get(this.currentChat);
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
        
        this.renderMessages();
        this.renderChatList();
        
        // Simulate response
        setTimeout(() => this.simulateResponse(), 2000);
    }
    
    async simulateResponse() {
        if (!this.currentChat) return;
        
        const responses = [
            'That sounds great!',
            'I understand perfectly.',
            'Thanks for the message.',
            'How interesting!',
            'I agree with you.',
            'Tell me more about it.'
        ];
        
        const contact = this.contacts.get(this.currentChat);
        const responseText = responses[Math.floor(Math.random() * responses.length)];
        
        const response = {
            text: responseText,
            translation: await this.translateText(responseText, contact.language, this.currentUser.language),
            sent: false,
            timestamp: new Date()
        };
        
        // Play receive sound
        if (this.receiveSound) this.receiveSound();
        
        this.messages.get(this.currentChat).push(response);
        this.renderMessages();
        this.renderChatList();
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
    
    // ============ UTILITY FUNCTIONS ============
    openAddContact() {
        document.getElementById('addContactModal').classList.remove('hidden');
    }
    
    closeAddContact() {
        document.getElementById('addContactModal').classList.add('hidden');
        document.getElementById('contactPhone').value = '';
        document.getElementById('contactResult').classList.add('hidden');
    }
    
    async searchContact() {
        const phone = document.getElementById('contactPhone').value.trim();
        if (!phone) {
            this.showAlert('Por favor ingresa un número de teléfono');
            return;
        }
        
        this.showLoading('Buscando contacto...');
        
        // Simulate search
        await this.delay(1500);
        
        this.hideLoading();
        
        // Mock search result
        if (phone === '1234567890' || phone === '+1234567890') {
            const resultDiv = document.getElementById('contactResult');
            resultDiv.innerHTML = `
                <div class="contact-found">
                    <div class="contact-avatar">👨</div>
                    <div class="contact-info">
                        <div class="contact-name">John Smith</div>
                        <div class="contact-language">🇺🇸 English</div>
                    </div>
                    <button class="add-btn" onclick="app.addContact('${phone}')">Agregar</button>
                </div>
            `;
            resultDiv.classList.remove('hidden');
        } else {
            this.showAlert('Usuario no encontrado en BeDub');
        }
    }
    
    addContact(phone) {
        this.showAlert('Contacto agregado exitosamente');
        this.closeAddContact();
        this.renderChatList();
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
        
        chatMain.classList.remove('active');
        chatMain.classList.add('show-placeholder');
        chatSidebar.classList.remove('chat-open');
        
        document.getElementById('activeChat').classList.add('hidden');
        document.querySelector('.no-chat-selected').classList.remove('hidden');
        
        this.currentChat = null;
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
        
        // Handle header visibility for translator section
        const mainHeader = document.querySelector('.main-header');
        if (section === 'translator') {
            mainHeader.style.display = 'none';
        } else {
            mainHeader.style.display = 'flex';
        }
        
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
            this.updateRecordingStatus('🎤 Escuchando...', 'recording');
            
            // Start microphone animation
            this.startMicrophoneAnimation();
            
            // Clear previous content
            document.getElementById('originalTextContent').textContent = 'Escuchando...';
            document.getElementById('translatedTextContent').textContent = 'Esperando traducción...';
            
            // Initialize speech recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.speechRecognition = new SpeechRecognition();
                
                const fromLang = document.getElementById('voiceFromLanguage').value;
                this.speechRecognition.lang = fromLang;
                this.speechRecognition.continuous = false;
                this.speechRecognition.interimResults = true;
                this.speechRecognition.maxAlternatives = 1;
                
                this.speechRecognition.onstart = () => {
                    console.log('Speech recognition started');
                    this.updateRecordingStatus('🎤 Habla ahora...', 'recording');
                };
                
                this.speechRecognition.onresult = async (event) => {
                    let interimTranscript = '';
                    let finalTranscript = '';
                    
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript;
                        } else {
                            interimTranscript += transcript;
                        }
                    }
                    
                    // Update original text in real time
                    const originalTextEl = document.getElementById('originalTextContent');
                    const displayText = finalTranscript || interimTranscript;
                    
                    if (displayText.trim()) {
                        originalTextEl.innerHTML = finalTranscript + 
                            (interimTranscript ? '<span style="opacity: 0.6; font-style: italic;">' + interimTranscript + '</span>' : '');
                        
                        // Translate when we have final text
                        if (finalTranscript.trim()) {
                            this.updateRecordingStatus('🔄 Traduciendo...', 'processing');
                            await this.translateVoiceText(finalTranscript.trim());
                        }
                    }
                };
                
                this.speechRecognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    if (event.error === 'not-allowed') {
                        this.showAlert('Por favor permite el acceso al micrófono en tu navegador.');
                    } else if (event.error === 'no-speech') {
                        this.updateRecordingStatus('❌ No se detectó voz', 'ready');
                        setTimeout(() => {
                            if (this.isVoiceRecording) {
                                this.speechRecognition.start();
                            }
                        }, 1000);
                        return;
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
        this.updateRecordingStatus('✅ Listo para grabar', 'ready');
        this.stopMicrophoneAnimation();
        
        if (this.speechRecognition) {
            this.speechRecognition.stop();
            this.speechRecognition = null;
        }
        
        // Clean up final text display
        const originalTextEl = document.getElementById('originalTextContent');
        if (originalTextEl.innerHTML) {
            originalTextEl.textContent = originalTextEl.textContent; // Remove HTML styling
        }
    }
    
    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('mainRecordBtn');
        const recordingVisual = document.getElementById('recordingVisual');
        const audioWaves = recordingVisual ? recordingVisual.querySelector('.audio-waves') : null;
        
        if (isRecording) {
            recordBtn.classList.add('recording');
            recordBtn.querySelector('.record-text').textContent = 'Grabando...';
            recordBtn.querySelector('.mic-icon i').className = 'fas fa-stop-circle';
            if (recordingVisual) recordingVisual.classList.add('active');
            if (audioWaves) audioWaves.classList.add('active');
        } else {
            recordBtn.classList.remove('recording');
            recordBtn.querySelector('.record-text').textContent = 'Toca para hablar';
            recordBtn.querySelector('.mic-icon i').className = 'fas fa-microphone';
            if (recordingVisual) recordingVisual.classList.remove('active');
            if (audioWaves) audioWaves.classList.remove('active');
        }
    }
    
    startMicrophoneAnimation() {
        const audioWaves = document.querySelector('.audio-waves');
        const waves = audioWaves.querySelectorAll('.wave');
        
        // Create random wave animation
        this.waveInterval = setInterval(() => {
            waves.forEach((wave, index) => {
                const height = Math.random() * 40 + 20;
                wave.style.height = height + 'px';
                wave.style.animationDelay = (index * 0.1) + 's';
            });
        }, 150);
    }
    
    stopMicrophoneAnimation() {
        if (this.waveInterval) {
            clearInterval(this.waveInterval);
            this.waveInterval = null;
        }
    }
    
    updateRecordingStatus(text, status) {
        const statusText = document.querySelector('.status-text');
        const statusIndicator = document.querySelector('.status-indicator');
        
        statusText.textContent = text;
        statusIndicator.className = `status-indicator ${status}`;
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
        document.getElementById('originalTextContent').textContent = 'Presiona el micrófono y comienza a hablar...';
        document.getElementById('translatedTextContent').textContent = 'La traducción aparecerá aquí automáticamente...';
        this.updateRecordingStatus('Listo para grabar', 'ready');
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
            this.showAlert(`Llamando a ${number}...`);
            // Add call to history (mock)
            // In real app, integrate with phone system
        } else {
            this.showAlert('Ingresa un número de teléfono');
        }
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

function openAddContact() {
    app.openAddContact();
}

function closeAddContact() {
    app.closeAddContact();
}

function searchContact() {
    app.searchContact();
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

function makeCall() {
    app.makeCall();
}

function makeVideoCall() {
    app.makeVideoCall();
}
