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
  updateDoc,
} from "firebase/firestore";

import { Navbar } from "../components/Navbar";
import { ChatWindow } from "../components/ChatWindow";
import { Chatlist } from "../components/ChatList";
import { auth, db } from "../firebase/firebase";
export function Chat() {
  const [users,setUsers]= useState([]);
  const[selectedUser,setSelectedUser]=useState(null);
  const[messages,setMessages]=useState([]);
  const[previews,setPreviews]=useState({});
  const[searchTerm,setSearchTerm]=useState("");

  useEffect(()=>{
    const unsubscribe = onSnapshot(
      collection(db,"users"),
      (snapshot) => {
        const usersData  = snapshot.docs.
        map((doc) => (
          {
            id: doc.id,
            ...doc.data(),
          }))
          .filter(
           (user) => user.id !=auth.currentUser?.uid
          );
          setUsers(usersData);
      },
      (error) => {
        console.error("Error getting users:", error);
      }
    );
    return () => unsubscribe();
  },[]);

  useEffect(() => {
    if(!auth.currentUser) return;
        const currentUserId = auth.currentUser.uid;
    const messageQuery = query(
      collection(db,"messages"),
      where (
        "participants",
        "array-contains",
        currentUserId
      ),
      orderBy("createdAt","asc")
    );

    const unsubscribe = onSnapshot (
      messageQuery,
      (snapshot) => {
        const allMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const latestMessages = {};

        allMessages.forEach((message) => {
          const otherUserId = 
          message.senderId === currentUserId
          ? message.receiverId
          : message.senderId;

          latestMessages[otherUserId] =message;
        });

        setPreviews(latestMessages);

        if(selectedUser)
{
          const selectedMessages = allMessages.filter(
          (message) => 
          (message.senderId === currentUserId && 
            message.receiverId ===selectedUser.id) ||
            (message.senderId === selectedUser.id &&
              message.receiverId === currentUserId
            )
          );
          setMessages(selectedMessages);
        }
        else {
          setMessages([]);
        }
      },
      (error) => {
        console.error(
          "Error getting messages:",
          error
        );
      }
    );

    return () => unsubscribe();
  },[selectedUser]);

  const handleSend = async (text) => {
    if (
      !selectedUser ||
      !auth.currentUser ||
      ! text.trim()
    )
    {
      return;
    }

    try {
      await addDoc(collection(db,"messeages"),{
        text: text.trim(),
        senderId:auth.currentUser.uid,
        receiverId: selectedUser.uid,
        participants: [
          auth.currentUser.uid,
          selectedUser.id,
        ],
   createdAt: serverTimestamp(),
      });
    }
    catch (error){
      console.error("Error sending message:", error);
    }
  };

  useEffect(()=>{
    if(!auth.currentUser) return;

    const userRef= doc(
    db,
    "users",
    auth.currentUser.uid
    );
    updateDoc(userRef, {
      isOnline: true,
    });
 return () => {
  updateDoc(userRef, {
    isOnline: false,
  });
 };
  },[]);


  return (
    <div className="container">
      <div className="list">
        <Navbar 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
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
        onSend={handleSend}/>
      </div>
    </div>
  );
}