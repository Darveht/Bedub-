
// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithPhoneNumber, 
    RecaptchaVerifier,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot,
    collection,
    addDoc,
    query,
    orderBy,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCFQ_geG0HIv2EZ-bfKc97TJNtf2sdqPzc",
    authDomain: "clack-koder.firebaseapp.com",
    databaseURL: "https://clack-koder-default-rtdb.firebaseio.com",
    projectId: "clack-koder",
    storageBucket: "clack-koder.firebasestorage.app",
    messagingSenderId: "478151254938",
    appId: "1:478151254938:web:e2c00e3a5426bd192b9023",
    measurementId: "G-P29ME5Z3S1"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Configurar reCAPTCHA para verificación SMS
export function setupRecaptcha() {
    try {
        if (!window.recaptchaVerifier) {
            // Crear contenedor para reCAPTCHA si no existe
            let recaptchaContainer = document.getElementById('recaptcha-container');
            if (!recaptchaContainer) {
                recaptchaContainer = document.createElement('div');
                recaptchaContainer.id = 'recaptcha-container';
                recaptchaContainer.style.display = 'none';
                document.body.appendChild(recaptchaContainer);
            }

            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    console.log('reCAPTCHA verified:', response);
                },
                'expired-callback': () => {
                    console.log('reCAPTCHA expired');
                    // Limpiar y recrear el verificador
                    if (window.recaptchaVerifier) {
                        window.recaptchaVerifier.clear();
                        window.recaptchaVerifier = null;
                    }
                },
                'error-callback': (error) => {
                    console.error('reCAPTCHA error:', error);
                    if (window.recaptchaVerifier) {
                        window.recaptchaVerifier.clear();
                        window.recaptchaVerifier = null;
                    }
                }
            });
        }
        return window.recaptchaVerifier;
    } catch (error) {
        console.error('Error setting up reCAPTCHA:', error);
        return null;
    }
}

// Enviar código de verificación SMS
export async function sendSMSVerification(phoneNumber) {
    try {
        console.log('Iniciando verificación SMS para:', phoneNumber);
        
        // Limpiar verificador anterior si existe
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
            } catch (e) {
                console.log('Error clearing previous verifier:', e);
            }
            window.recaptchaVerifier = null;
        }

        const appVerifier = setupRecaptcha();
        
        if (!appVerifier) {
            throw new Error('No se pudo configurar reCAPTCHA');
        }
        
        console.log('reCAPTCHA configurado, renderizando...');
        
        // Renderizar el reCAPTCHA
        try {
            await appVerifier.render();
            console.log('reCAPTCHA renderizado exitosamente');
        } catch (renderError) {
            console.error('Error rendering reCAPTCHA:', renderError);
            throw new Error('Error configurando verificación de seguridad');
        }
        
        console.log('Enviando SMS con Firebase...');
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        
        // Guardar para verificación posterior
        window.confirmationResult = confirmationResult;
        
        console.log('SMS enviado exitosamente');
        return {
            success: true,
            verificationId: confirmationResult.verificationId,
            message: 'Código enviado exitosamente'
        };
    } catch (error) {
        console.error('Error completo sending SMS:', error);
        
        // Limpiar verificador en caso de error
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
            } catch (e) {
                console.log('Error clearing verifier on error:', e);
            }
            window.recaptchaVerifier = null;
        }
        
        let errorMessage = 'Error al enviar código SMS';
        
        if (error.code === 'auth/invalid-phone-number') {
            errorMessage = 'Número de teléfono inválido. Verifica el formato.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Demasiadas solicitudes. Intenta más tarde.';
        } else if (error.code === 'auth/captcha-check-failed') {
            errorMessage = 'Error de verificación de seguridad. Recarga la página.';
        } else if (error.code === 'auth/quota-exceeded') {
            errorMessage = 'Límite de SMS excedido. Intenta más tarde.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

// Verificar código SMS
export async function verifySMSCode(code) {
    try {
        const result = await window.confirmationResult.confirm(code);
        const user = result.user;
        
        // Crear perfil de usuario en Firestore
        await createUserProfile(user);
        
        return {
            success: true,
            user: user
        };
    } catch (error) {
        console.error('Error verifying code:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Crear perfil de usuario en Firestore
export async function createUserProfile(user, additionalData = {}) {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        const { phoneNumber } = user;
        const createdAt = new Date();
        
        try {
            await setDoc(userRef, {
                phoneNumber,
                createdAt,
                lastSeen: createdAt,
                isOnline: true,
                ...additionalData
            });
        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    }
    
    return userRef;
}

// Escuchar cambios de autenticación
export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

// Actualizar estado en línea del usuario
export async function updateUserOnlineStatus(userId, isOnline) {
    if (!userId) return;
    
    const userRef = doc(db, 'users', userId);
    try {
        await setDoc(userRef, {
            isOnline,
            lastSeen: new Date()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating online status:', error);
    }
}

// Enviar mensaje a Firestore
export async function sendMessage(chatId, senderId, message, translation = null) {
    try {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messageData = {
            senderId,
            text: message,
            translation,
            timestamp: new Date(),
            read: false
        };
        
        await addDoc(messagesRef, messageData);
        
        // Actualizar último mensaje en el chat
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
            lastMessage: message,
            lastMessageTime: new Date(),
            lastSenderId: senderId
        }, { merge: true });
        
        return { success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
}

// Escuchar mensajes en tiempo real
export function listenToMessages(chatId, callback) {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            messages.push({
                id: doc.id,
                ...doc.data()
            });
        });
        callback(messages);
    });
}

// Escuchar chats del usuario
export function listenToUserChats(userId, callback) {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', userId));
    
    return onSnapshot(q, (snapshot) => {
        const chats = [];
        snapshot.forEach((doc) => {
            chats.push({
                id: doc.id,
                ...doc.data()
            });
        });
        callback(chats);
    });
}
