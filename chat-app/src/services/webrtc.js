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
  return await navigation.mediaDevices.getUserMedia({
    audio: true,
    vedio: false,
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