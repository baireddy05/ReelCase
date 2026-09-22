import { config } from './config.js';
import { state } from './state.js';

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore,
    doc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Initialize Firebase
let app, auth, db, provider;

try {
    app = initializeApp(config.firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    provider = new GoogleAuthProvider();
} catch (error) {
    console.error("Firebase Initialization Error (check your config):", error);
}

export const fb = {
    auth,
    db,
    unsubscribeSnapshot: null,
    
    initAuthListener(onLogin, onLogout) {
        if (!auth) return;
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("User logged in:", user.uid);
                state.user = user;
                
                // Sync any offline changes made when they were disconnected
                const offlineWatchlist = localStorage.getItem('offline_watchlist');
                if (offlineWatchlist) {
                    try {
                        const parsed = JSON.parse(offlineWatchlist);
                        if (parsed && (parsed.movies.length > 0 || parsed.series.length > 0)) {
                            state.watchlist = parsed;
                            this.saveWatchlist();
                            localStorage.removeItem('offline_watchlist');
                            console.log("Synced offline edits to Firestore");
                        }
                    } catch(e) { console.error("Error syncing offline data", e); }
                }

                this.listenToUserWatchlist(user.uid);
                if(onLogin) onLogin(user);
            } else {
                console.log("User logged out");
                state.user = null;
                state.watchlist = { movies: [], series: [] }; // Reset state
                if (this.unsubscribeSnapshot) {
                    this.unsubscribeSnapshot();
                }
                if(onLogout) onLogout();
            }
        });
    },

    async signInWithGoogle() {
        if (!auth) return;
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Google Sign-In Error", error);
            alert(error.message);
        }
    },

    async signInWithEmail(email, password) {
         if (!auth) return;
         try {
             await signInWithEmailAndPassword(auth, email, password);
         } catch(error) {
             console.error("Email Login Error", error);
             alert(error.message);
         }
    },

    async signUpWithEmail(email, password) {
         if (!auth) return;
         try {
             await createUserWithEmailAndPassword(auth, email, password);
         } catch(error) {
             console.error("Email Sign-Up Error", error);
             alert(error.message);
         }
    },

    async logout() {
        if (!auth) return;
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Sign-Out Error", error);
        }
    },

    listenToUserWatchlist(uid) {
        if (!db) return;
        const docRef = doc(db, "watchlists", uid);
        this.unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() || {};
                state.watchlist = {
                    movies: Array.isArray(data.movies) ? data.movies : [],
                    series: Array.isArray(data.series) ? data.series : []
                };
            } else {
                // Initialize empty watchlist in Firestore
                setDoc(docRef, { movies: [], series: [] });
                state.watchlist = { movies: [], series: [] };
            }
            // Trigger a re-render
            document.dispatchEvent(new CustomEvent('watchlistUpdated'));
        }, (error) => {
            console.error("Firestore Error:", error);
            // Fallback for offline mode if it was cached
        });
    },

    async saveWatchlist() {
        if (!db || !state.user) return;
        try {
            const docRef = doc(db, "watchlists", state.user.uid);
            await setDoc(docRef, state.watchlist);
        } catch (error) {
            console.error("Error saving watchlist:", error);
            // Fallback to local storage if offline
            localStorage.setItem('offline_watchlist', JSON.stringify(state.watchlist));
        }
    }
};
