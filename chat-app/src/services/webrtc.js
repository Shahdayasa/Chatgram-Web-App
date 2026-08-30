import { db } from "../firebase/firebase";

import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  query,
  where,
} from "firebase/firestore";

const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export function createPeerConnection() {
  return new RTCPeerConnection(configuration);
}

export async function getAudioStream() {
  return await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
}

export async function createCall(
  callId,
  callerId,
  receiverId,
  stream,
  sessionId,
  onRemoteStream
) {
  const peerConnection = createPeerConnection();

  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });

  peerConnection.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    }
  };

  const callRef = doc(db, "calls", callId);
  const callerCandidatesRef = collection(callRef, "callerCandidates");

  peerConnection.onicecandidate = async (event) => {
    if (!event.candidate) return;

    try {
      await addDoc(callerCandidatesRef, event.candidate.toJSON());
    } catch (error) {
      console.error("Error adding caller ICE candidate:", error);
    }
  };

  const offer = await peerConnection.createOffer();

  await peerConnection.setLocalDescription(offer);

  await setDoc(callRef, {
    callerId,
    receiverId,
    sessionId,
    status: "calling",
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
    createdAt: Date.now(),
  });

  return peerConnection;
}

export function listenForAnswer(callId, peerConnection, onStatusChange) {
  const callRef = doc(db, "calls", callId);

  return onSnapshot(callRef, async (snapshot) => {
    const data = snapshot.data();

    if (!data) return;

    if (data.answer && !peerConnection.currentRemoteDescription) {
      try {
        const answer = new RTCSessionDescription(data.answer);

        await peerConnection.setRemoteDescription(answer);

        if (onStatusChange) {
          onStatusChange("connected");
        }
      } catch (error) {
        console.error("Error setting remote answer:", error);
      }
    }

    if (data.status === "rejected") {
      onStatusChange?.("rejected");
    }

    if (data.status === "ended") {
      onStatusChange?.("ended");
    }
  });
}

export function listenForReceiverCandidates(callId, peerConnection) {
  const callRef = doc(db, "calls", callId);
  const receiverCandidatesRef = collection(callRef, "receiverCandidates");

  return onSnapshot(receiverCandidatesRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;

      const candidate = new RTCIceCandidate(change.doc.data());

      peerConnection.addIceCandidate(candidate).catch((error) => {
        console.error("Error adding receiver ICE candidate:", error);
      });
    });
  });
}

export async function acceptCall(callId, stream, onRemoteStream) {
  const callRef = doc(db, "calls", callId);
  const callSnapshot = await getDoc(callRef);

  if (!callSnapshot.exists()) {
    throw new Error("Call does not exist");
  }

  const callData = callSnapshot.data();

  if (!callData.offer) {
    throw new Error("Call offer does not exist");
  }

  const peerConnection = createPeerConnection();

  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });

  peerConnection.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    }
  };

  const receiverCandidatesRef = collection(callRef, "receiverCandidates");

  peerConnection.onicecandidate = async (event) => {
    if (!event.candidate) return;

    try {
      await addDoc(receiverCandidatesRef, event.candidate.toJSON());
    } catch (error) {
      console.error("Error adding receiver ICE candidate:", error);
    }
  };

  const offer = new RTCSessionDescription(callData.offer);

  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(answer);

  await updateDoc(callRef, {
    answer: {
      type: answer.type,
      sdp: answer.sdp,
    },
    status: "connected",
  });

  return { peerConnection, callData };
}

export function listenForCallStatus(callId, onStatusChange) {
  const callRef = doc(db, "calls", callId);

  return onSnapshot(callRef, (snapshot) => {
    const data = snapshot.data();

    if (!data) return;

    if (data.status === "ended") {
      onStatusChange("ended");
    }

    if (data.status === "rejected") {
      onStatusChange("rejected");
    }

    if (data.status === "connected") {
      onStatusChange("connected");
    }
  });
}

export function listenForCallerCandidates(callId, peerConnection) {
  const callRef = doc(db, "calls", callId);
  const callerCandidatesRef = collection(callRef, "callerCandidates");

  return onSnapshot(callerCandidatesRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;

      const candidate = new RTCIceCandidate(change.doc.data());

      peerConnection.addIceCandidate(candidate).catch((error) => {
        console.error("Error adding caller ICE candidate:", error);
      });
    });
  });
}

export async function rejectCall(callId) {
  const callRef = doc(db, "calls", callId);

  await updateDoc(callRef, {
    status: "rejected",
  });
}

export async function endCall(callId) {
  const callRef = doc(db, "calls", callId);

  await updateDoc(callRef, {
    status: "ended",
  });
}

export function listenForIncomingCalls(myUid, onIncomingCall) {
  const callsQuery = query(
    collection(db, "calls"),
    where("receiverId", "==", myUid),
    where("status", "==", "calling")
  );

  return onSnapshot(callsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;

      onIncomingCall({ id: change.doc.id, ...change.doc.data() });
    });
  });
}

export async function createCallSession(uid) {
  const sessionRef = doc(collection(db, "callSessions"));

  await setDoc(sessionRef, {
    participants: [uid],
    initiatorId: uid,
    createdAt: Date.now(),
  });

  return sessionRef.id;
}

export async function joinCallSession(sessionId, uid) {
  const sessionRef = doc(db, "callSessions", sessionId);

  await updateDoc(sessionRef, {
    participants: arrayUnion(uid),
  });
}

export async function leaveCallSession(sessionId, uid) {
  const sessionRef = doc(db, "callSessions", sessionId);

  await updateDoc(sessionRef, {
    participants: arrayRemove(uid),
  }).catch(() => {});
}

export async function getCallSessionParticipants(sessionId) {
  const sessionRef = doc(db, "callSessions", sessionId);
  const snapshot = await getDoc(sessionRef);

  if (!snapshot.exists()) return [];

  return snapshot.data().participants || [];
}

export function listenForCallSession(sessionId, onChange) {
  const sessionRef = doc(db, "callSessions", sessionId);

  return onSnapshot(sessionRef, (snapshot) => {
    const data = snapshot.data();

    onChange(data?.participants || []);
  });
}