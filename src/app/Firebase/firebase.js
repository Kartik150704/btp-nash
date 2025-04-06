// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCNzJTbaeiVKF4CE7al4nBEEVIGmHXow_g",
    authDomain: "clow-299e7.firebaseapp.com",
    projectId: "clow-299e7",
    storageBucket: "clow-299e7.firebasestorage.app",
    messagingSenderId: "545191502437",
    appId: "1:545191502437:web:6feb86b1317864dd68dc8c",
    measurementId: "G-7BMGPHTWC3"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Google Auth Provider
const provider = new GoogleAuthProvider();

export { auth, provider };
