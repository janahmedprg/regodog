// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  deleteDoc,
  getDoc,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const isBrowser = typeof window !== "undefined";
const auth: Auth | null = isBrowser ? getAuth(app) : null;
const provider = isBrowser ? new GoogleAuthProvider() : null;
const db = getFirestore(app);
const storage = getStorage(app);

export {
  auth,
  db,
  collection,
  getDocs,
  addDoc,
  provider,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  getDoc,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  query,
  where,
  runTransaction,
};
// const analytics = getAnalytics(app);
