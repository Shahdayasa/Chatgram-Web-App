import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";


const firebaseConfig = {
  apiKey: "AIzaSyBj-tWDx_18zlakdHwymGqENWIpzLw5N3M",
  authDomain: "chat-app-30eab.firebaseapp.com",
  projectId: "chat-app-30eab",
  storageBucket: "chat-app-30eab.firebasestorage.app",
  messagingSenderId: "936090502273",
  appId: "1:936090502273:web:40db59b2544fae8baa7980",
  measurementId: "G-6BGT32V03X",

  databaseURL: "https://chat-app-30eab-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);