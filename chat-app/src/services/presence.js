import {
  ref,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
} from "firebase/database";

import { realtimeDb } from "../firebase/firebase";

export function setupPresence(userId) {
  if (!userId) return () => {};

  const connectedRef = ref(realtimeDb, ".info/connected");

  const presenceRef = ref(
    realtimeDb,
    `presence/${userId}`
  );

  const unsubscribe = onValue(connectedRef, async (snapshot) => {
    if (snapshot.val() !== true) {
      return;
    }

    try {
      await onDisconnect(presenceRef).set({
        state: "offline",
        lastChanged: serverTimestamp(),
      });

      await set(presenceRef, {
        state: "online",
        lastChanged: serverTimestamp(),
      });
    } catch (error) {
      console.error("Presence setup error:", error);
    }
  });

  return unsubscribe;
}