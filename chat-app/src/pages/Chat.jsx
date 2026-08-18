import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  doc,
  setDoc,
} from "firebase/firestore";

import { Navbar } from "../components/Navbar";
import { ChatWindow } from "../components/ChatWindow";
import { Chatlist } from "../components/ChatList";
import { auth, db } from "../firebase/firebase";

export function Chat() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [previews, setPreviews] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // =========================
  // GET USERS
  // =========================
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersData = snapshot.docs
          .map((userDoc) => {
            const userData = userDoc.data();

            console.log("USER FROM FIRESTORE:", {
              id: userDoc.id,
              ...userData,
            });

            return {
              id: userDoc.id,
              ...userData,
            };
          })
          .filter(
            (user) =>
              user.id !== auth.currentUser?.uid &&
              user.name &&
              user.email &&
              user.uid
          );

        setUsers(usersData);
      },
      (error) => {
        console.error("Error getting users:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================
  // GET MESSAGES
  // =========================
  useEffect(() => {
    if (!auth.currentUser) return;

    const currentUserId = auth.currentUser.uid;

    const messageQuery = query(
      collection(db, "messages"),
      where("participants", "array-contains", currentUserId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      messageQuery,
      (snapshot) => {
        const allMessages = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }));

        // Store latest message for each user
        const latestMessages = {};

        allMessages.forEach((message) => {
          const otherUserId =
            message.senderId === currentUserId
              ? message.receiverId
              : message.senderId;

          latestMessages[otherUserId] = message;
        });

        setPreviews(latestMessages);

        // Messages for selected user
        if (selectedUser) {
          const selectedMessages = allMessages.filter(
            (message) =>
              (message.senderId === currentUserId &&
                message.receiverId === selectedUser.uid) ||
              (message.senderId === selectedUser.uid &&
                message.receiverId === currentUserId)
          );

          setMessages(selectedMessages);
        } else {
          setMessages([]);
        }
      },
      (error) => {
        console.error("Error getting messages:", error);
      }
    );

    return () => unsubscribe();
  }, [selectedUser]);

  // =========================
  // SEND MESSAGE
  // =========================
  const handleSend = async (text) => {
    if (
      !selectedUser ||
      !auth.currentUser ||
      !text.trim()
    ) {
      return;
    }

    try {
      await addDoc(collection(db, "messages"), {
        text: text.trim(),

        senderId: auth.currentUser.uid,

        receiverId: selectedUser.uid,

        participants: [
          auth.currentUser.uid,
          selectedUser.uid,
        ],

        createdAt: serverTimestamp(),
      });

      console.log("Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // =========================
  // ONLINE / OFFLINE STATUS
  // =========================
  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log("No authenticated user yet.");
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    // User is online
    setDoc(
      userRef,
      {
        isOnline: true,
      },
      {
        merge: true,
      }
    ).catch((error) => {
      console.error("Error setting user online:", error);
    });

    // User goes offline
    return () => {
      setDoc(
        userRef,
        {
          isOnline: false,
        },
        {
          merge: true,
        }
      ).catch((error) => {
        console.error("Error setting user offline:", error);
      });
    };
  }, []);

  
  return (
    <div className="container">

      <div className="list">

      <Navbar
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
  onSelectUser={setSelectedUser}
/>

        <Chatlist
          users={users}
          onSelectUser={setSelectedUser}
          previews={previews}
          searchTerm={searchTerm}
        />

      </div>

      <div className="chat-area">

        <ChatWindow
          selectedUser={selectedUser}
          messages={messages}
          onSend={handleSend}
        />

      </div>

    </div>
  );
}