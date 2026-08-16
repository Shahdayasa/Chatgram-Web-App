import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBj-tWDx_18zlakdHwymGqENWIpzLw5N3M",
  authDomain: "chat-app-30eab.firebaseapp.com",
  projectId: "chat-app-30eab",
  storageBucket: "chat-app-30eab.firebasestorage.app",
  messagingSenderId: "936090502273",
  appId: "1:936090502273:web:40db59b2544fae8baa7980",
  measurementId: "G-6BGT32V03X"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);