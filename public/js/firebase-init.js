import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyA07GVdG1oug0W2Kw01TZ8kXHhyuQLE4Bs",
    authDomain: "vision360-d37f8.firebaseapp.com",
    projectId: "vision360-d37f8",
    storageBucket: "vision360-d37f8.firebasestorage.app",
    messagingSenderId: "66282212150",
    appId: "1:66282212150:web:317ed00e71086697418197",
    measurementId: "G-8JRC30E3CV"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };