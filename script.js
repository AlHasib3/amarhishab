// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { firebaseConfig } from './firebase_config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// UI Elements
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const showLoginLink = document.getElementById('show-login');
const showRegisterLink = document.getElementById('show-register');
const messageDiv = document.getElementById('message');

// Redirect if user is already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, redirect to the main app.
    window.location.href = 'amar_hishab.html';
  }
});

// Show login form and hide registration
if (showLoginLink) {
  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    clearMessage();
  });
}

// Show registration form and hide login
if (showRegisterLink) {
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    clearMessage();
  });
}

// Show message helper
function showMessage(msg, isError = true) {
  messageDiv.textContent = msg;
  messageDiv.classList.remove('success'); // Remove success class if it was there
  if (isError) {
    messageDiv.style.color = '#e53e3e'; // Redundant with CSS but for clarity
    messageDiv.classList.remove('success');
  } else {
    messageDiv.style.color = '#2f855a'; // Redundant with CSS but for clarity
    messageDiv.classList.add('success');
  }
  messageDiv.classList.add('show');
  setTimeout(() => {
    clearMessage();
  }, 5000);
}

// Clear message helper
function clearMessage() {
  messageDiv.textContent = '';
  messageDiv.classList.remove('show');
  messageDiv.classList.remove('success');
}

// Password validation function
function isPasswordStrong(password) {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+])[A-Za-z\d@$!%*?&#^()_+]{6,}$/;
  return strongRegex.test(password);
}

// Register form submit
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!fullName) {
      showMessage('অনুগ্রহ করে আপনার সম্পূর্ণ নাম লিখুন।');
      return;
    }
    if (!email) {
        showMessage('অনুগ্রহ করে আপনার ইমেইল লিখুন।');
        return;
    }
    if (!password) {
        showMessage('অনুগ্রহ করে আপনার পাসওয়ার্ড লিখুন।');
        return;
    }

    if (!isPasswordStrong(password)) {
      showMessage('পাসওয়ার্ড দুর্বল! অনুগ্রহ করে নির্দেশনা অনুসরণ করুন।');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      
      showMessage('রেজিস্ট্রেশন সফল হয়েছে! আপনি এখন লগইন করতে পারেন।', false);
      
      registerForm.reset();
      registerForm.classList.remove('active');
      loginForm.classList.add('active');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        showMessage('এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা আছে।');
      } else if (error.code === 'auth/invalid-email') {
        showMessage('ইমেইল অ্যাড্রেসটি সঠিক নয়।');
      } else {
        showMessage('রেজিস্ট্রেশন ব্যর্থ হয়েছে: ' + error.message);
      }
    }
  });
}

// Login form submit
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email) {
        showMessage('অনুগ্রহ করে আপনার ইমেইল লিখুন।');
        return;
    }
    if (!password) {
        showMessage('অনুগ্রহ করে আপনার পাসওয়ার্ড লিখুন।');
        return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showMessage('লগইন সফল হয়েছে! আপনাকে অ্যাপে নিয়ে যাওয়া হচ্ছে...', false);
      
      setTimeout(() => {
        window.location.href = 'amar_hishab.html'; 
      }, 1500);
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        showMessage('ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।');
      } else if (error.code === 'auth/invalid-email') {
        showMessage('ইমেইল অ্যাড্রেসটি সঠিক নয়।');
      }
       else {
        showMessage('লগইন ব্যর্থ হয়েছে: ' + error.message);
      }
    }
  });
}