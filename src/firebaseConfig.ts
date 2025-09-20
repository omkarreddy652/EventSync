import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxTQ8qXloETPUdpgyQTDFuVA6VGIECxCM",
  authDomain: "event-5030a.firebaseapp.com",
  databaseURL: "https://event-5030a-default-rtdb.firebaseio.com",
  projectId: "event-5030a",
  storageBucket: "event-5030a.firebasestorage.app",
  messagingSenderId: "731185278241",
  appId: "1:731185278241:web:d0f4231f6b1003bd3be260",
  measurementId: "G-RSP4T9M2KG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);