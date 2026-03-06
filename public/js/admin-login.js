import { auth } from "./firebase-init.js";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const ADMIN_EMAIL = "admin@vision360.com"; // Change here if needed

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const googleLoginBtn = document.getElementById("google-login-btn");
    const errorMsg = document.getElementById("error-msg");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const showError = (message) => {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
    };

    // Listen for auth state changes to redirect if already logged in and authorized
    onAuthStateChanged(auth, (user) => {
        if (user) {
            checkAuthorization(user);
        }
    });

    const checkAuthorization = async (user) => {
        if (user.email === ADMIN_EMAIL) {
            window.location.href = "dashboard.html";
        } else {
            showError("You are not authorized.");
            await signOut(auth);
        }
    };

    // Email/Password Login
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorMsg.style.display = "none";

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await checkAuthorization(userCredential.user);
        } catch (error) {
            console.error(error);
            showError("Login failed: " + error.message);
        }
    });

    // Google Login
    googleLoginBtn.addEventListener("click", async () => {
        errorMsg.style.display = "none";
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            await checkAuthorization(result.user);
        } catch (error) {
            console.error(error);
            showError("Google login failed: " + error.message);
        }
    });
});
