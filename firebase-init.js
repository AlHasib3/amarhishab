// firebase-init.js

// Firebase Configuration - REPLACE WITH YOUR ACTUAL CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyCsk1DZ1kpvOwVfGKigBGkakd6PM0Puuvk", // YOUR_API_KEY from Firebase Project Settings
  authDomain: "amarhishab-1b9fd.firebaseapp.com", // YOUR_PROJECT_ID.firebaseapp.com
  projectId: "amarhishab-1b9fd", // YOUR_PROJECT_ID
  storageBucket: "amarhishab-1b9fd.firebasestorage.app", // YOUR_PROJECT_ID.appspot.com
  messagingSenderId: "94504095130", // Your Sender ID from Firebase Project Settings -> Cloud Messaging
  appId: "1:94504095130:web:eb011a9407e0b092323e23" // Your Web App ID from Firebase Project Settings
};

// Initialize Firebase
if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
  try {
      firebase.initializeApp(firebaseConfig);
  } catch (e) {
      console.error("Firebase initialization error (firebase-init.js):", e);
      // If already initialized, this might throw an error, which is fine.
      if (e.code !== 'duplicate-app') {
          // Handle other initialization errors
          alert("Firebase could not be initialized. Please check your configuration and network.");
      }
  }
} else {
  console.error("Firebase SDK not loaded before firebase-init.js. Make sure Firebase scripts are included in HTML.");
  alert("Firebase SDK not loaded. The application cannot start.");
}

// Firebase services (global for access in script.js)
// Ensure firebase is defined before trying to access its services
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Function to show/hide a global loading indicator
// This function assumes an element with id 'loadingIndicator' exists in your HTML.
function showGlobalLoading(show) {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
      if (show) {
          indicator.classList.remove('hidden');
      } else {
          indicator.classList.add('hidden');
      }
  } else {
      // console.warn("Global loading indicator element not found.");
  }
}

// Attempt to enable Firestore offline persistence
// This should be called once, ideally before any other Firestore operations.
function enableFirestorePersistence() {
  if (!db) {
      console.error("Firestore (db) is not initialized. Cannot enable persistence.");
      return Promise.reject("Firestore not initialized");
  }
  // Check if persistence has already been enabled in this session/tab
  // Note: Firestore's enablePersistence throws an error if called multiple times unless settings are identical or on different tabs without synchronizeTabs.
  // A simple flag might not be enough for complex scenarios, but good for basic control.
  if (window.firestorePersistenceEnabled) {
      console.log("Firestore persistence already attempted in this session.");
      return Promise.resolve(true); // Assuming it was successful or handled before.
  }

  return db.enablePersistence({ synchronizeTabs: true }) // synchronizeTabs for multi-tab consistency
      .then(() => {
          console.log("Offline persistence enabled (firebase-init.js).");
          window.firestorePersistenceEnabled = true; // Set a flag
          return true; // Indicate success
      })
      .catch((err) => {
          window.firestorePersistenceEnabled = true; // Mark as attempted even if failed, to prevent re-attempts
          if (err.code === 'failed-precondition') {
              // This error means persistence could not be enabled, possibly because:
              // 1. Multiple tabs are open, and synchronizeTabs:true is trying to coordinate.
              // 2. Persistence has already been enabled with different settings.
              // 3. The browser doesn't support IndexedDB fully or is in private/incognito mode.
              console.warn("Persistence failed (firebase-init.js): Multiple tabs, browser limitations, or already enabled with different settings. Firestore will work online.");
          } else if (err.code === 'unimplemented') {
              console.warn("Persistence not available in this browser (firebase-init.js). Firestore will work online.");
          } else {
              console.error("Persistence error (firebase-init.js):", err);
          }
          return false; // Indicate failure or issue
      });
}

// Example of how you might call it early (optional, script.js can also call it)
// document.addEventListener('DOMContentLoaded', () => {
//     enableFirestorePersistence().then(status => {
//         console.log("Initial persistence attempt status:", status);
//     });
// });

// Note: auth and db are now global variables if firebase-init.js is loaded before script.js.
// If you were using ES modules, you would export them:
// export { auth, db, enableFirestorePersistence, showGlobalLoading, firebaseConfig };