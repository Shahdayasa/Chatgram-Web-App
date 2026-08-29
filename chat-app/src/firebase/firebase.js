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

export async function getUsersFromAPI() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not logged in");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    "https://firestore.googleapis.com/v1/projects/chat-app-30eab/databases/(default)/documents/users",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }

  const data = await response.json();

  return (data.documents || []).map((document) => {
    const fields = document.fields || {};

    return {
    
  id: document.name.split("/").pop(),
  uid: fields.uid?.stringValue || "",
  name: fields.name?.stringValue || "",
  email: fields.email?.stringValue || "",
  phone: fields.phone?.stringValue || "",
  description: fields.description?.stringValue || "",
  avatar: fields.avatar?.stringValue || "",
  isOnline: fields.isOnline?.booleanValue || false,
  lastSeen: fields.lastSeen?.timestampValue || null,

    };
  });
}