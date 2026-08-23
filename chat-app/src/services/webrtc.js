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

export function createPeerConnsection () {
  return new RTCPeerConnection(configuration);
}
export async function getAudioStream() {
  return await navigation.mediaDevices.getUserMedia({
    audio: true,
    vedio: false,
  });
}