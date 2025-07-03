
// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithPhoneNumber, 
    RecaptchaVerifier,
    onAuthStateChanged 
} from 'firebase/auth';
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

// Tu configuración de Firebase (reemplaza con tus credenciales)
const firebaseConfig = {
    apiKey: "tu-api-key",
    authDomain: "tu-project.firebaseapp.com",
    projectId: "tu-project-id",
    storageBucket: "tu-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "tu-app-id"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configurar reCAPTCHA para verificación SMS
export function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': (response) => {
                console.log('reCAPTCHA verified');
            },
            'expired-callback': () => {
                console.log('reCAPTCHA expired');
            }
        });
    }
}

// Enviar código de verificación SMS
export async function sendSMSVerification(phoneNumber) {
    try {
        setupRecaptcha();
        const appVerifier = window.recaptchaVerifier;
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        
        // Guardar para verificación posterior
        window.confirmationResult = confirmationResult;
        
        return {
            success: true,
            verificationId: confirmationResult.verificationId
        };
    } catch (error) {
        console.error('Error sending SMS:', error);
        return {
            success: false,
            error: error.message
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
