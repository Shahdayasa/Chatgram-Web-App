import { auth, db } from "../firebase/firebase";

import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export function createPeerConnection () {
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

  const callerCandidatesRef = collection(
    callRef,
    "callerCandidates"
  );

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(
        callerCandidatesRef,
        event.candidate.toJSON()
      );
    }
  };

  const offer = await peerConnection.createOffer();

  await peerConnection.setLocalDescription(offer);

  await setDoc(callRef, {
    callerId,
    receiverId,
    status: "calling",
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
    createdAt: Date.now(),
  });

  return peerConnection;
}
export function listenForAnswer(callId, peerConnection) {
  const callRef = doc(db, "calls", callId);

  return onSnapshot(callRef, async (snapshot) => {
    const data = snapshot.data();

    if (!data) return;

    if (
      data.answer &&
      !peerConnection.currentRemoteDescription
    ) {
      const answer = new RTCSessionDescription(data.answer);

      await peerConnection.setRemoteDescription(answer);
    }
  });
}

export function listenForReceiverCandidates(
  callId,
  peerConnection
) {
  const callRef = doc(db, "calls",callId);

  const receiverCandidatesRef = collection (
    callRef,
    "receiverCandidates"
  );

  return onSnapshot (
    receiverCandidatesRef,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if(change.type === "added") {
          const candidate = new RTCIceCandidate(
            change.doc.data()
          );

          peerConnection.addIceCandidate(candidate);
        }
      });
    }
  );
}

export async function acceptCall (
callId,
stream,
onRemoteStream
) {
  const callRef = doc (db,"calls",callId);
  const callSnapShot = await getDoc (callRef);

  if(!callSnapShot.exists()) {
    throw new Error("Call does not exist");
  }

  const callData = callSnapShot.data();
  const peerConnection = createPeerConnection();

  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track,stream);
  });

  peerConnection.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream (event.streams[0]);
    }
  };

  const receiverCandidatesRef = collection (
    callRef,
    "receiverCandidates"
  );

  peerConnection.onicecandidate = async (event) => {
    if(event.candidate) {
      await addDoc (
        receiverCandidatesRef,
        event.candidate.toJSON()
      );
    }
  };

  const offer = callData.offer;

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription (offer)
  );

  const answer = await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(answer);

  await updateDoc(callRef, {
    answer: {
      type: answer.type,
      sdp: answer.sdp,
    },
    status : "connected",
  });
  return peerConnection;
}

export function listenForCallerCandidates(
  callId,
  peerConnection
)

{
  const callRef = doc(db, "calls" , callId);

  const callerCandidatesRef = collection(
    callRef,
    "callerCandidates"
  );

  return onSnapshot(
    callerCandidatesRef,
    (snapshot) => 
    {
      snapshot.docChanges().forEach((change)=>{
        if(change.type === "added") {
          const candidate = new RTCIceCandidate(
            change.doc.data()
          );

          peerConnection.addIceCandidate(candidate);
        }
      });
    }
  );
}

export async function rejectCall (callId) {

  const callRef = doc(db, "callls",callId);

  await updateDoc(callRef, {
    status: "rejected",
  });
}

export async function endCall (callId) {

  const callRef = doc(db, "callls",callId);

  await updateDoc(callRef, {
    status: "ended",
  });
}

