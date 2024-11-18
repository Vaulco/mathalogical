// firebase-config.ts
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC64Nu09ntwkYLFRVTYm8bq6Qq4M3rpCrw",
  authDomain: "mathalogical-99af8.firebaseapp.com",
  projectId: "mathalogical-99af8",
  storageBucket: "mathalogical-99af8.firebasestorage.app",
  messagingSenderId: "33177156835",
  appId: "1:33177156835:web:8e2e98c5cda3000046d9d6"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);