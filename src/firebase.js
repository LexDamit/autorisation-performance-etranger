import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDor7sg-u8myzW6X0zJD6PdcxAnUPJSEfU",
  authDomain: "athleteautorisation.firebaseapp.com",
  projectId: "athleteautorisation",
  storageBucket: "athleteautorisation.firebasestorage.app",
  messagingSenderId: "751281282204",
  appId: "1:751281282204:web:0d6df88c96873f7b6ba159"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
