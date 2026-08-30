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
  limitToLast,
  endBefore,
  getDocs,
  getDoc,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

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
  createCallSession,
  joinCallSession,
  leaveCallSession,
  getCallSessionParticipants,
  listenForCallSession,
} from "../services/webrtc";

export function Chat() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const oldestMessageRef = useRef(null);

  const usersRef = useRef([]);

  const [previews, setPreviews] = useState({});
  const [groups, setGroups] = useState([]);
  const [groupPreviews, setGroupPreviews] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});

  const [callState, setCallState] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});

  const [isSpeaking, setIsSpeaking] = useState(false);

  const [showParticipants, setShowParticipants] = useState(false);
  const [callParticipants, setCallParticipants] = useState([]);
  const [ringingUids, setRingingUids] = useState([]);

  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const callIdsByUidRef = useRef({});
  const sessionIdRef = useRef(null);
  const processedCallIdsRef = useRef(new Set());

  useEffect(() => {
    const combinedStreams = Object.values(remoteStreams);

    if (combinedStreams.length === 0) {
      setIsSpeaking(false);
      return;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const analysers = [];

    combinedStreams.forEach((stream) => {
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);

      analysers.push({ analyser, source });
    });

    let animationFrame;

    const checkVolume = () => {
      let maxAverage = 0;

      analysers.forEach(({ analyser }) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        analyser.getByteFrequencyData(dataArray);

        let sum = 0;

        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }

        const average = sum / dataArray.length;

        if (average > maxAverage) maxAverage = average;
      });

      setIsSpeaking(maxAverage > 10);

      animationFrame = requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return () => {
      cancelAnimationFrame(animationFrame);

      analysers.forEach(({ source, analyser }) => {
        source.disconnect();
        analyser.disconnect();
      });

      audioContext.close();
    };
  }, [remoteStreams]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const currentUserId = auth.currentUser?.uid;

        const usersData = snapshot.docs
          .map((userDoc) => {
            const userData = userDoc.data();

            return {
              id: userDoc.id,
              uid: userData.uid || userDoc.id,
              ...userData,
            };
          })
          .filter((user) => {
            return (
              user.uid !== currentUserId &&
              user.id !== currentUserId &&
              user.name
            );
          });

        setUsers(usersData);
        usersRef.current = usersData;
      },
      (error) => {
        console.error("Error getting users:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().catch((error) => {
        console.error("Notification permission error:", error);
      });
    }
  }, []);

  useEffect(() => {
    let unsubscribeMessages = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        if (unsubscribeMessages) {
          unsubscribeMessages();
          unsubscribeMessages = null;
        }

        return;
      }

      if (Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch (error) {
          console.error("Permission request failed:", error);
        }
      }

      if (Notification.permission !== "granted") {
        return;
      }

      const messagesQuery = query(
        collection(db, "messages"),
        where("receiverId", "==", currentUser.uid)
      );

      let initialized = false;

      unsubscribeMessages = onSnapshot(
        messagesQuery,
        async (snapshot) => {
          if (!initialized) {
            initialized = true;
            return;
          }

          for (const change of snapshot.docChanges()) {
            if (change.type !== "added") {
              continue;
            }

            const message = change.doc.data();

            if (message.senderId === currentUser.uid) {
              continue;
            }

            let senderName = "New message";

            const localSender = usersRef.current.find(
              (user) => user.uid === message.senderId
            );

            if (localSender?.name) {
              senderName = localSender.name;
            } else if (message.senderId) {
              try {
                const senderRef = doc(db, "users", message.senderId);

                const senderSnapshot = await getDoc(senderRef);

                if (senderSnapshot.exists()) {
                  const senderData = senderSnapshot.data();

                  senderName =
                    senderData.name ||
                    senderData.displayName ||
                    senderData.username ||
                    "New message";
                }
              } catch (error) {
                console.error("Error getting sender:", error);
              }
            }

            let body = "New message";

            if (typeof message.text === "string" && message.text.trim()) {
              body = message.text.trim();
            } else if (message.imageUrl) {
              body = "📷 Photo";
            } else if (message.fileUrl) {
              body = `📎 ${message.fileName || "File"}`;
            }

            try {
              const notification = new Notification(senderName, {
                body,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: `chat-message-${change.doc.id}`,
                requireInteraction: false,
              });

              notification.onclick = () => {
                window.focus();
                notification.close();

                const sender = usersRef.current.find(
                  (user) => user.uid === message.senderId
                );

                if (sender) {
                  setSelectedUser(sender);
                }
              };
            } catch (error) {
              console.error("Failed to create notification:", error);
            }
          }
        },
        (error) => {
          console.error("Notification listener error:", error);
        }
      );
    });

    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }

      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const previewsQuery = query(
      collection(db, "messages"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      previewsQuery,
      (snapshot) => {
        const latestMessagesMap = {};
        const unreadMap = {};

        snapshot.docs.forEach((messageDoc) => {
          const message = messageDoc.data();

          const otherId =
            message.senderId === currentUser.uid
              ? message.receiverId
              : message.senderId;

          if (otherId) {
            latestMessagesMap[otherId] = {
              id: messageDoc.id,
              ...message,
            };
          }

          if (
            message.receiverId === currentUser.uid &&
            message.senderId &&
            !message.read
          ) {
            unreadMap[message.senderId] =
              (unreadMap[message.senderId] || 0) + 1;
          }
        });

        setPreviews(latestMessagesMap);
        setUnreadCounts(unreadMap);
      },
      (error) => {
        console.error("Error getting previews:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    if (!selectedUser || selectedUser.isGroup) {
      return;
    }

    const currentUserId = auth.currentUser.uid;
    const otherUserId = selectedUser.uid;

    setMessages([]);
    setLoadingOlder(false);
    setHasMoreMessages(true);
    oldestMessageRef.current = null;

    const messageQuery = query(
      collection(db, "messages"),
      where("participants", "array-contains", currentUserId),
      orderBy("createdAt", "asc"),
      limitToLast(10)
    );

    const unsubscribe = onSnapshot(
      messageQuery,
      (snapshot) => {
        const allLatestMessages = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }));

        const selectedMessages = allLatestMessages.filter(
          (message) =>
            (message.senderId === currentUserId &&
              message.receiverId === otherUserId) ||
            (message.senderId === otherUserId &&
              message.receiverId === currentUserId)
        );

        if (selectedMessages.length > 0) {
          const oldestSelected = selectedMessages[0];

          const oldestDoc = snapshot.docs.find(
            (docSnap) => docSnap.id === oldestSelected.id
          );

          if (oldestDoc) {
            oldestMessageRef.current = oldestDoc;
          }
        }

        setMessages(selectedMessages);

        selectedMessages.forEach((message) => {
          if (
            message.receiverId === currentUserId &&
            message.senderId === otherUserId &&
            !message.read
          ) {
            updateDoc(doc(db, "messages", message.id), {
              read: true,
              readAt: serverTimestamp(),
            }).catch((error) =>
              console.error("Error marking message read:", error)
            );
          }

          if (message.receiverId === currentUserId && !message.delivered) {
            updateDoc(doc(db, "messages", message.id), {
              delivered: true,
              deliveredAt: serverTimestamp(),
            }).catch((error) =>
              console.error("Error marking message delivered:", error)
            );
          }
        });
      },
      (error) => {
        console.error("Error getting messages:", error);
      }
    );

    return () => unsubscribe();
  }, [selectedUser]);

  useEffect(() => {
    let unsubscribeGroups = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubscribeGroups) {
        unsubscribeGroups();
        unsubscribeGroups = null;
      }

      if (!currentUser) {
        setGroups([]);
        return;
      }

      const groupsQuery = query(
        collection(db, "groups"),
        where("members", "array-contains", currentUser.uid)
      );

      unsubscribeGroups = onSnapshot(
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
        }
      );
    });

    return () => {
      if (unsubscribeGroups) unsubscribeGroups();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!selectedUser?.isGroup) return;

    const updatedGroup = groups.find((g) => g.id === selectedUser.id);

    if (updatedGroup && updatedGroup !== selectedUser) {
      setSelectedUser(updatedGroup);
    }
  }, [groups, selectedUser]);

  useEffect(() => {
    if (groups.length === 0) {
      setGroupPreviews({});
      return;
    }

    const groupIds = groups.map((g) => g.id).slice(0, 10);

    const previewQuery = query(
      collection(db, "messages"),
      where("groupId", "in", groupIds),
      orderBy("createdAt", "asc")
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
      }
    );

    return () => unsubscribe();
  }, [groups]);

  useEffect(() => {
    if (!selectedUser?.isGroup) return;

    setMessages([]);
    setLoadingOlder(false);
    setHasMoreMessages(true);
    oldestMessageRef.current = null;

    const groupMessagesQuery = query(
      collection(db, "messages"),
      where("groupId", "==", selectedUser.id),
      orderBy("createdAt", "asc"),
      limitToLast(10)
    );

    const unsubscribe = onSnapshot(
      groupMessagesQuery,
      (snapshot) => {
        const groupMessages = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }));

        if (snapshot.docs.length > 0) {
          oldestMessageRef.current = snapshot.docs[0];
        }

        setHasMoreMessages(snapshot.docs.length === 10);

        setMessages(groupMessages);
      },
      (error) => {
        console.error("Error getting group messages:", error);
      }
    );

    return () => unsubscribe();
  }, [selectedUser]);

  const loadOlderMessages = async () => {
    if (
      loadingOlder ||
      !hasMoreMessages ||
      !selectedUser ||
      !oldestMessageRef.current
    ) {
      return;
    }

    try {
      setLoadingOlder(true);

      const currentUserId = auth.currentUser.uid;

      if (selectedUser.isGroup) {
        const olderQuery = query(
          collection(db, "messages"),
          where("groupId", "==", selectedUser.id),
          orderBy("createdAt", "asc"),
          endBefore(oldestMessageRef.current),
          limitToLast(10)
        );

        const snapshot = await getDocs(olderQuery);

        if (snapshot.empty) {
          setHasMoreMessages(false);
          return;
        }

        const olderMessages = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }));

        oldestMessageRef.current = snapshot.docs[0];

        if (snapshot.docs.length < 10) {
          setHasMoreMessages(false);
        }

        setMessages((prev) => [...olderMessages, ...prev]);

        return;
      }

      const olderQuery = query(
        collection(db, "messages"),
        where("participants", "array-contains", currentUserId),
        orderBy("createdAt", "asc"),
        endBefore(oldestMessageRef.current),
        limitToLast(10)
      );

      const snapshot = await getDocs(olderQuery);

      if (snapshot.empty) {
        setHasMoreMessages(false);
        return;
      }

      const olderMessages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }));

      const filteredOlderMessages = olderMessages.filter(
        (message) =>
          (message.senderId === currentUserId &&
            message.receiverId === selectedUser.uid) ||
          (message.senderId === selectedUser.uid &&
            message.receiverId === currentUserId)
      );

      oldestMessageRef.current = snapshot.docs[0];

      if (snapshot.docs.length < 10) {
        setHasMoreMessages(false);
      }

      if (filteredOlderMessages.length > 0) {
        setMessages((prev) => [...filteredOlderMessages, ...prev]);
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleSend = async (message, replyTo) => {
    if (!selectedUser || !auth.currentUser) {
      return;
    }

    const isAttachment = typeof message === "object" && message !== null;

    const text = isAttachment ? message.text || "" : message;
    const imageUrl = isAttachment ? message.imageUrl || null : null;
    const fileUrl = isAttachment ? message.fileUrl || null : null;
    const fileName = isAttachment ? message.fileName || null : null;
    const fileType = isAttachment ? message.fileType || null : null;
    const fileSize = isAttachment ? message.fileSize || null : null;

    if (!text?.trim() && !imageUrl && !fileUrl) {
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
          participants: [auth.currentUser.uid, selectedUser.uid],
          createdAt: serverTimestamp(),
          delivered: false,
          read: false,
          replyTo: replyToData,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);

    setDoc(userRef, { isOnline: true }, { merge: true }).catch((error) =>
      console.error("Error setting user online:", error)
    );

    return () => {
      setDoc(
        userRef,
        { isOnline: false, lastSeen: serverTimestamp() },
        { merge: true }
      ).catch((error) => console.error("Error setting user offline:", error));
    };
  }, []);

  useEffect(() => {
    if (!callState) {
      setCallParticipants([]);
      return;
    }

    const sessionId = sessionIdRef.current;

    if (!sessionId) return;

    const unsubscribe = listenForCallSession(sessionId, (participantUids) => {
      const mapped = participantUids.map((uid) => {
        if (uid === auth.currentUser?.uid) {
          return {
            uid,
            name: auth.currentUser.displayName || "You",
            avatar: auth.currentUser.photoURL || null,
          };
        }

        return users.find((user) => user.uid === uid) || { uid, name: "User" };
      });

      setCallParticipants(mapped);
    });

    return () => unsubscribe();
  }, [callState, users]);

  const cleanupPeer = (uid) => {
    const pc = peerConnectionsRef.current[uid];

    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[uid];
    }

    delete callIdsByUidRef.current[uid];

    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });

    setRingingUids((prev) => prev.filter((id) => id !== uid));

    if (sessionIdRef.current) {
      leaveCallSession(sessionIdRef.current, uid);
    }
  };

  const cleanupCall = () => {
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());

    peerConnectionsRef.current = {};
    callIdsByUidRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    sessionIdRef.current = null;

    setPeerConnection(null);
    setLocalStream(null);
    setRemoteStreams({});
    setRingingUids([]);
    setCallState(null);
    setIsSpeaking(false);
    setCallParticipants([]);
    setShowParticipants(false);
  };

  const callParticipant = async (user) => {
    if (!user || !auth.currentUser || !sessionIdRef.current) return;
    if (peerConnectionsRef.current[user.uid]) return;

    const stream = localStreamRef.current;

    if (!stream) return;

    try {
      setRingingUids((prev) => [...prev, user.uid]);

      const callRef = doc(collection(db, "calls"));
      const newCallId = callRef.id;

      const pc = await createCall(
        newCallId,
        auth.currentUser.uid,
        user.uid,
        stream,
        sessionIdRef.current,
        (remoteAudioStream) => {
          setRemoteStreams((prev) => ({
            ...prev,
            [user.uid]: remoteAudioStream,
          }));
        }
      );

      peerConnectionsRef.current[user.uid] = pc;
      callIdsByUidRef.current[user.uid] = newCallId;

      listenForAnswer(newCallId, pc, async (status) => {
        if (status === "rejected" || status === "ended") {
          cleanupPeer(user.uid);
          return;
        }

        if (status === "connected") {
          setRingingUids((prev) => prev.filter((id) => id !== user.uid));
          await joinCallSession(sessionIdRef.current, user.uid);
        }
      });

      listenForReceiverCandidates(newCallId, pc);

      listenForCallStatus(newCallId, (status) => {
        if (status === "ended" || status === "rejected") {
          cleanupPeer(user.uid);
        }
      });

      setShowParticipants(false);
    } catch (error) {
      console.error("Error calling participant:", error);
      cleanupPeer(user.uid);
    }
  };

  const meshConnectToUid = async (uid) => {
    const targetUser = usersRef.current.find((user) => user.uid === uid);

    if (targetUser) {
      await callParticipant(targetUser);
      return;
    }

    if (!auth.currentUser || !sessionIdRef.current || !localStreamRef.current)
      return;
    if (peerConnectionsRef.current[uid]) return;

    try {
      const callRef = doc(collection(db, "calls"));
      const newCallId = callRef.id;

      const pc = await createCall(
        newCallId,
        auth.currentUser.uid,
        uid,
        localStreamRef.current,
        sessionIdRef.current,
        (remoteAudioStream) => {
          setRemoteStreams((prev) => ({ ...prev, [uid]: remoteAudioStream }));
        }
      );

      peerConnectionsRef.current[uid] = pc;
      callIdsByUidRef.current[uid] = newCallId;

      listenForAnswer(newCallId, pc, async (status) => {
        if (status === "rejected" || status === "ended") {
          cleanupPeer(uid);
          return;
        }

        if (status === "connected") {
          await joinCallSession(sessionIdRef.current, uid);
        }
      });

      listenForReceiverCandidates(newCallId, pc);

      listenForCallStatus(newCallId, (status) => {
        if (status === "ended" || status === "rejected") {
          cleanupPeer(uid);
        }
      });
    } catch (error) {
      console.error("Error connecting mesh peer:", error);
    }
  };

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const callsQuery = query(
      collection(db, "calls"),
      where("receiverId", "==", currentUser.uid),
      where("status", "==", "calling")
    );

    const unsubscribe = onSnapshot(
      callsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type !== "added") return;

          const callDoc = change.doc;

          if (processedCallIdsRef.current.has(callDoc.id)) return;

          const callData = callDoc.data();

          if (
            sessionIdRef.current &&
            callData.sessionId === sessionIdRef.current
          ) {
            processedCallIdsRef.current.add(callDoc.id);

            try {
              const stream = localStreamRef.current;

              if (!stream) return;

              const { peerConnection: pc } = await acceptCall(
                callDoc.id,
                stream,
                (remoteAudioStream) => {
                  setRemoteStreams((prev) => ({
                    ...prev,
                    [callData.callerId]: remoteAudioStream,
                  }));
                }
              );

              peerConnectionsRef.current[callData.callerId] = pc;
              callIdsByUidRef.current[callData.callerId] = callDoc.id;

              listenForCallerCandidates(callDoc.id, pc);

              listenForCallStatus(callDoc.id, (status) => {
                if (status === "ended" || status === "rejected") {
                  cleanupPeer(callData.callerId);
                }
              });

              await joinCallSession(sessionIdRef.current, callData.callerId);
            } catch (error) {
              console.error("Error auto-joining mesh call:", error);
            }

            return;
          }

          if (!callState) {
            const caller = users.find(
              (user) => user.uid === callData.callerId
            );

            if (!caller) return;

            processedCallIdsRef.current.add(callDoc.id);

            setIncomingCall({
              callId: callDoc.id,
              caller,
              sessionId: callData.sessionId,
            });
          }
        });
      },
      (error) => {
        console.error("Error listening for incoming calls:", error);
      }
    );

    return () => unsubscribe();
  }, [users, callState]);

  const handleCall = async () => {
    if (!selectedUser || !auth.currentUser || callState) {
      return;
    }

    if (selectedUser.isGroup) {
      return;
    }

    try {
      const stream = await getAudioStream();

      localStreamRef.current = stream;
      setLocalStream(stream);

      const sessionId = await createCallSession(auth.currentUser.uid);

      sessionIdRef.current = sessionId;

      const callRef = doc(collection(db, "calls"));
      const newCallId = callRef.id;

      const pc = await createCall(
        newCallId,
        auth.currentUser.uid,
        selectedUser.uid,
        stream,
        sessionId,
        (remoteAudioStream) => {
          setRemoteStreams((prev) => ({
            ...prev,
            [selectedUser.uid]: remoteAudioStream,
          }));
        }
      );

      peerConnectionsRef.current[selectedUser.uid] = pc;
      callIdsByUidRef.current[selectedUser.uid] = newCallId;

      setCallState("calling");
      setPeerConnection(pc);

      listenForAnswer(newCallId, pc, async (status) => {
        if (status === "rejected" || status === "ended") {
          cleanupCall();
          return;
        }

        if (status === "connected") {
          setCallState("connected");
          await joinCallSession(sessionId, selectedUser.uid);
        }
      });

      listenForReceiverCandidates(newCallId, pc);

      listenForCallStatus(newCallId, (status) => {
        if (status === "ended" || status === "rejected") {
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

      localStreamRef.current = stream;
      setLocalStream(stream);
      sessionIdRef.current = incomingCall.sessionId;

      const { peerConnection: pc } = await acceptCall(
        incomingCall.callId,
        stream,
        (remoteAudioStream) => {
          setRemoteStreams((prev) => ({
            ...prev,
            [incomingCall.caller.uid]: remoteAudioStream,
          }));
        }
      );

      peerConnectionsRef.current[incomingCall.caller.uid] = pc;
      callIdsByUidRef.current[incomingCall.caller.uid] = incomingCall.callId;

      setCallState("connected");
      setPeerConnection(pc);

      listenForCallerCandidates(incomingCall.callId, pc);

      listenForCallStatus(incomingCall.callId, (status) => {
        if (status === "ended" || status === "rejected") {
          cleanupPeer(incomingCall.caller.uid);
        }
      });

      await joinCallSession(incomingCall.sessionId, auth.currentUser.uid);

      const participants = await getCallSessionParticipants(
        incomingCall.sessionId
      );

      const others = participants.filter(
        (uid) => uid !== auth.currentUser.uid && uid !== incomingCall.caller.uid
      );

      for (const uid of others) {
        await meshConnectToUid(uid);
      }

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
    const uids = Object.keys(callIdsByUidRef.current);

    try {
      for (const uid of uids) {
        const id = callIdsByUidRef.current[uid];

        if (id) {
          await endCall(id);
        }
      }

      if (sessionIdRef.current && auth.currentUser) {
        await leaveCallSession(sessionIdRef.current, auth.currentUser.uid);
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }

    cleanupCall();
    setIncomingCall(null);
  };

  const availableParticipants = users.filter((user) => {
    const alreadyInCall = callParticipants.some(
      (participant) => participant.uid === user.uid
    );

    const alreadyRinging = ringingUids.includes(user.uid);

    return !alreadyInCall && !alreadyRinging;
  });

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
          unreadCounts={unreadCounts}
        />
      </div>

      <div className="chat-area">
        <ChatWindow
          selectedUser={selectedUser}
          messages={messages}
          onSend={handleSend}
          onCall={handleCall}
          users={users}
          onExitGroup={() => setSelectedUser(null)}
          onLoadOlder={loadOlderMessages}
          loadingOlder={loadingOlder}
          hasMoreMessages={hasMoreMessages}
        />
      </div>

      {callState && selectedUser && (
        <CallModal
          selectedUser={selectedUser}
          callState={callState}
          onEndCall={handleEndCall}
          isSpeaking={isSpeaking}
          users={availableParticipants}
          callParticipants={callParticipants}
          ringingUids={ringingUids}
          showParticipants={showParticipants}
          setShowParticipants={setShowParticipants}
          onAddParticipant={callParticipant}
        />
      )}

      {incomingCall && (
        <IncomingCall
          caller={incomingCall.caller}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {Object.entries(remoteStreams).map(([uid, stream]) => (
        <audio
          key={uid}
          autoPlay
          ref={(audio) => {
            if (audio) {
              audio.srcObject = stream;
            }
          }}
        />
      ))}
    </div>
  );
}