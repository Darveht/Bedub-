
// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithPhoneNumber, 
    RecaptchaVerifier,
    onAuthStateChanged 
} from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
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
} from 'firebase/firestore';

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
                console.log('reCAPTCHA verified');
            },
            'expired-callback': () => {
                console.log('reCAPTCHA expired');
                // Limpiar y recrear el verificador
                window.recaptchaVerifier = null;
            }
        });
    }
    return window.recaptchaVerifier;
}

// Enviar código de verificación SMS
export async function sendSMSVerification(phoneNumber) {
    try {
        // Limpiar verificador anterior si existe
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }

        const appVerifier = setupRecaptcha();
        
        // Renderizar el reCAPTCHA
        await appVerifier.render();
        
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        
        // Guardar para verificación posterior
        window.confirmationResult = confirmationResult;
        
        return {
            success: true,
            verificationId: confirmationResult.verificationId,
            message: 'Código enviado exitosamente'
        };
    } catch (error) {
        console.error('Error sending SMS:', error);
        
        // Limpiar verificador en caso de error
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }
        
        let errorMessage = 'Error al enviar código SMS';
        
        if (error.code === 'auth/invalid-phone-number') {
            errorMessage = 'Número de teléfono inválido';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Demasiadas solicitudes. Intenta más tarde';
        } else if (error.code === 'auth/captcha-check-failed') {
            errorMessage = 'Error de verificación. Intenta de nuevo';
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
