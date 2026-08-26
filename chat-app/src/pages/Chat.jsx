import { useEffect, useRef, useState } from "react";
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
  updateDoc,
} from "firebase/firestore";

import { Navbar } from "../components/Navbar";
import { ChatWindow } from "../components/ChatWindow";
import { Chatlist } from "../components/ChatList";
import { auth, db } from "../firebase/firebase";
import CallModal from "../components/CallModal";
import IncomingCall from "../components/IncomingCall";

import {
  getAudioStream,
  createCall,
  acceptCall,
  listenForAnswer,
  listenForReceiverCandidates,
  listenForCallerCandidates,
  listenForCallStatus,
  rejectCall,
  endCall,
} from "../services/webrtc";

export function Chat() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [previews, setPreviews] = useState({});
  const [groups, setGroups] = useState([]);
  const [groupPreviews, setGroupPreviews] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const [callId, setCallId] = useState(null);
  const [callState, setCallState] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callIdRef = useRef(null);

  useEffect(() => {
    if (!remoteStream) {
      setIsSpeaking(false);
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;

    const source =
      audioContext.createMediaStreamSource(remoteStream);

    source.connect(analyser);

    const dataArray = new Uint8Array(
      analyser.frequencyBinCount,
    );

    let animationFrame;

    const checkVolume = () => {
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;

      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }

      const average = sum / dataArray.length;

      setIsSpeaking(average > 10);

      animationFrame = requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return () => {
      cancelAnimationFrame(animationFrame);
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [remoteStream]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersData = snapshot.docs
          .map((userDoc) => {
            const userData = userDoc.data();

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
              user.uid,
          );

        setUsers(usersData);
      },
      (error) => {
        console.error("Error getting users:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const currentUserId = auth.currentUser.uid;

    const messageQuery = query(
      collection(db, "messages"),
      where("participants", "array-contains", currentUserId),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      messageQuery,
      (snapshot) => {
        const allMessages = snapshot.docs.map(
          (messageDoc) => ({
            id: messageDoc.id,
            ...messageDoc.data(),
          }),
        );

        const latestMessages = {};

        allMessages.forEach((message) => {
          const otherUserId =
            message.senderId === currentUserId
              ? message.receiverId
              : message.senderId;

          if (otherUserId) {
            latestMessages[otherUserId] = message;
          }
        });

        setPreviews(latestMessages);

        allMessages.forEach((message) => {
          if (
            message.receiverId === currentUserId &&
            message.senderId !== currentUserId &&
            !message.delivered
          ) {
            updateDoc(doc(db, "messages", message.id), {
              delivered: true,
              deliveredAt: serverTimestamp(),
            }).catch((error) => {
              console.error(
                "Error marking message delivered:",
                error,
              );
            });
          }
        });

        if (selectedUser && !selectedUser.isGroup) {
          allMessages.forEach((message) => {
            if (
              message.senderId === selectedUser.uid &&
              message.receiverId === currentUserId &&
              !message.read
            ) {
              updateDoc(doc(db, "messages", message.id), {
                read: true,
                readAt: serverTimestamp(),
              }).catch((error) => {
                console.error(
                  "Error marking message read:",
                  error,
                );
              });
            }
          });

          const selectedMessages = allMessages.filter(
            (message) =>
              (message.senderId === currentUserId &&
                message.receiverId === selectedUser.uid) ||
              (message.senderId === selectedUser.uid &&
                message.receiverId === currentUserId),
          );

          setMessages(selectedMessages);
        } else if (!selectedUser) {
          setMessages([]);
        }
      },
      (error) => {
        console.error("Error getting messages:", error);
      },
    );

    return () => unsubscribe();
  }, [selectedUser]);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const groupsQuery = query(
      collection(db, "groups"),
      where("members", "array-contains", currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      groupsQuery,
      (snapshot) => {
        const groupsData = snapshot.docs.map((groupDoc) => ({
          id: groupDoc.id,
          uid: groupDoc.id,
          isGroup: true,
          ...groupDoc.data(),
        }));

        setGroups(groupsData);
      },
      (error) => {
        console.error("Error getting groups:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (groups.length === 0) {
      setGroupPreviews({});
      return;
    }

    const groupIds = groups.map((g) => g.id).slice(0, 10);

    const previewQuery = query(
      collection(db, "messages"),
      where("groupId", "in", groupIds),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      previewQuery,
      (snapshot) => {
        const latest = {};

        snapshot.docs.forEach((messageDoc) => {
          const data = messageDoc.data();

          latest[data.groupId] = {
            id: messageDoc.id,
            ...data,
          };
        });

        setGroupPreviews(latest);
      },
      (error) => {
        console.error("Error getting group previews:", error);
      },
    );

    return () => unsubscribe();
  }, [groups]);

  useEffect(() => {
    if (!selectedUser?.isGroup) return;

    const groupMessagesQuery = query(
      collection(db, "messages"),
      where("groupId", "==", selectedUser.id),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      groupMessagesQuery,
      (snapshot) => {
        const groupMessages = snapshot.docs.map(
          (messageDoc) => ({
            id: messageDoc.id,
            ...messageDoc.data(),
          }),
        );

        setMessages(groupMessages);
      },
      (error) => {
        console.error(
          "Error getting group messages:",
          error,
        );
      },
    );

    return () => unsubscribe();
  }, [selectedUser]);
const handleSend = async (message, replyTo) => {
  if (!selectedUser || !auth.currentUser) {
    return;
  }

  const isAttachment =
    typeof message === "object" && message !== null;

  const text = isAttachment
    ? message.text || ""
    : message;

  const imageUrl = isAttachment
    ? message.imageUrl || null
    : null;

  const fileUrl = isAttachment
    ? message.fileUrl || null
    : null;

  const fileName = isAttachment
    ? message.fileName || null
    : null;

  const fileType = isAttachment
    ? message.fileType || null
    : null;

  const fileSize = isAttachment
    ? message.fileSize || null
    : null;

  if (
    !text?.trim() &&
    !imageUrl &&
    !fileUrl
  ) {
    return;
  }

  const replyToData = replyTo
    ? {
        id: replyTo.id,
        text: replyTo.text || "",
        senderId: replyTo.senderId,
      }
    : null;

  try {
    if (selectedUser.isGroup) {
      await addDoc(collection(db, "messages"), {
        text: text?.trim() || "",

        imageUrl,
        fileUrl,
        fileName,
        fileType,
        fileSize,

        senderId: auth.currentUser.uid,
        groupId: selectedUser.id,
        isGroup: true,

        createdAt: serverTimestamp(),

        replyTo: replyToData,
      });
    } else {
      await addDoc(collection(db, "messages"), {
        text: text?.trim() || "",

        imageUrl,
        fileUrl,
        fileName,
        fileType,
        fileSize,

        senderId: auth.currentUser.uid,
        receiverId: selectedUser.uid,

        participants: [
          auth.currentUser.uid,
          selectedUser.uid,
        ],

        createdAt: serverTimestamp(),

        delivered: false,
        read: false,

        replyTo: replyToData,
      });
    }
  } catch (error) {
    console.error(
      "Error sending message:",
      error,
    );
  }
};
  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);

    setDoc(
      userRef,
      {
        isOnline: true,
      },
      {
        merge: true,
      },
    ).catch((error) => {
      console.error("Error setting user online:", error);
    });

    return () => {
      setDoc(
        userRef,
        {
          isOnline: false,
          lastSeen: serverTimestamp(),
        },
        {
          merge: true,
        },
      ).catch((error) => {
        console.error(
          "Error setting user offline:",
          error,
        );
      });
    };
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const callsQuery = query(
      collection(db, "calls"),
      where("receiverId", "==", currentUser.uid),
      where("status", "==", "calling"),
    );

    const unsubscribe = onSnapshot(
      callsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setIncomingCall(null);
          return;
        }

        const callDoc = snapshot.docs[0];
        const callData = callDoc.data();

        const caller = users.find(
          (user) => user.uid === callData.callerId,
        );

        if (!caller) return;

        setIncomingCall({
          callId: callDoc.id,
          caller,
        });
      },
      (error) => {
        console.error(
          "Error Listening for incoming calls:",
          error,
        );
      },
    );

    return () => unsubscribe();
  }, [users]);

  const handleCall = async () => {
    if (!selectedUser || !auth.currentUser || callState) {
      return;
    }

    if (selectedUser.isGroup) {
      return;
    }

    try {
      const stream = await getAudioStream();

      const callRef = doc(collection(db, "calls"));
      const newCallId = callRef.id;

      const pc = await createCall(
        newCallId,
        auth.currentUser.uid,
        selectedUser.uid,
        stream,
        (remoteAudioStream) => {
          setRemoteStream(remoteAudioStream);
        },
      );

      peerConnectionRef.current = pc;
      localStreamRef.current = stream;
      callIdRef.current = newCallId;

      setCallId(newCallId);
      setCallState("calling");
      setLocalStream(stream);
      setPeerConnection(pc);

      listenForAnswer(newCallId, pc, (status) => {
        if (status === "rejected" || status === "ended") {
          cleanupCall();
          return;
        }

        if (status === "connected") {
          setCallState("connected");
        }
      });

      listenForReceiverCandidates(newCallId, pc);

      listenForCallStatus(newCallId, (status) => {
        if (
          status === "ended" ||
          status === "rejected"
        ) {
          cleanupCall();
          setIncomingCall(null);
        }
      });
    } catch (error) {
      console.error("Error starting call:", error);
      cleanupCall();
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      const stream = await getAudioStream();

      const pc = await acceptCall(
        incomingCall.callId,
        stream,
        (remoteAudioStream) => {
          setRemoteStream(remoteAudioStream);
        },
      );

      peerConnectionRef.current = pc;
      localStreamRef.current = stream;
      callIdRef.current = incomingCall.callId;

      setCallId(incomingCall.callId);
      setCallState("connected");
      setLocalStream(stream);
      setPeerConnection(pc);

      listenForCallerCandidates(
        incomingCall.callId,
        pc,
      );

      listenForCallStatus(
        incomingCall.callId,
        (status) => {
          if (
            status === "ended" ||
            status === "rejected"
          ) {
            cleanupCall();
            setIncomingCall(null);
          }
        },
      );

      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    try {
      await rejectCall(incomingCall.callId);
      setIncomingCall(null);
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  };

  const handleEndCall = async () => {
    const id = callIdRef.current;

    try {
      if (id) {
        await endCall(id);
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }

    cleanupCall();
    setIncomingCall(null);
  };

  const cleanupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      localStreamRef.current = null;
    }

    callIdRef.current = null;

    setPeerConnection(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCallId(null);
    setCallState(null);
    setIsSpeaking(false);
  };

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
          groups={groups}
          onSelectUser={setSelectedUser}
          previews={previews}
          groupPreviews={groupPreviews}
          searchTerm={searchTerm}
        />
      </div>

      <div className="chat-area">
        <ChatWindow
          selectedUser={selectedUser}
          messages={messages}
          onSend={handleSend}
          onCall={handleCall}
          users={users}
        />
      </div>

      {callState && selectedUser && (
        <CallModal
          selectedUser={selectedUser}
          callState={callState}
          onEndCall={handleEndCall}
          isSpeaking={isSpeaking}
        />
      )}

      {incomingCall && (
        <IncomingCall
          caller={incomingCall.caller}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {remoteStream && (
        <audio
          autoPlay
          ref={(audio) => {
            if (audio) {
              audio.srcObject = remoteStream;
            }
          }}
        />
      )}
    </div>
  );
}