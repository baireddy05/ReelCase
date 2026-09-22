import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, onAuthStateChanged, signInWithPopup, googleProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
    const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const signupWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);

    const value = {
        user,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
