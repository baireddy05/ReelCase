import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "firebase/auth";
import { 
    getFirestore,
    doc,
    setDoc,
    onSnapshot
} from "firebase/firestore";

// Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBg1uh8mHXDFMwibyvYrsWRHNEi4qsRrR8",
    authDomain: "movie-bucket-list-928ec.firebaseapp.com",
    projectId: "movie-bucket-list-928ec",
    storageBucket: "movie-bucket-list-928ec.firebasestorage.app",
    messagingSenderId: "416721368754",
    appId: "1:416721368754:web:7ff849edb3c3d9e4d2fbab",
    measurementId: "G-FYFQPFHKCP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { 
    onAuthStateChanged, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail,
    doc,
    setDoc,
    onSnapshot
};
