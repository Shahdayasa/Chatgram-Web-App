import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { auth, db } from "../firebase/firebase";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

export function Chatlist({
  users = [],
  groups = [],
  onSelectUser,
  previews = {},
  groupPreviews = {},
  searchTerm = "",
  unreadCounts = {},
}) {
  const [contactNames, setContactNames] = useState({});

  
  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setContactNames({});
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setContactNames({});
          return;
        }

        const data = snapshot.data();

        setContactNames(data.contactNames || {});
      },
      (error) => {
        console.error("Error loading contact names:", error);
        setContactNames({});
      }
    );

    return () => unsubscribe();
  }, []);

  const search = searchTerm.trim().toLowerCase();

  const getUserId = (user) => {
    return user?.uid || user?.id;
  };

  const getDisplayName = (user) => {
    if (!user) return "Unknown";

    const uid = getUserId(user);

    return (
      contactNames?.[uid]?.trim() ||
      user.name ||
      user.displayName ||
      "Unknown"
    );
  };

  const userItems = users
    .filter((user) => {
      const uid = getUserId(user);

      return uid && previews[uid];
    })
    .map((user) => {
      const uid = getUserId(user);

      return {
        type: "user",
        id: uid,
        data: user,
        preview: previews[uid],
        sortDate:
          previews[uid]?.createdAt?.toDate?.() || new Date(0),
      };
    });

  
  const groupItems = groups.map((group) => ({
    type: "group",
    id: group.id,
    data: group,
    preview: groupPreviews[group.id],
    sortDate:
      groupPreviews[group.id]?.createdAt?.toDate?.() ||
      group.createdAt?.toDate?.() ||
      new Date(0),
  }));

  let chatItems;

  
  if (search === "") {
    chatItems = [...userItems, ...groupItems].sort(
      (a, b) => b.sortDate - a.sortDate
    );
  }


  else {
    const filteredUsers = users
      .filter((user) => {
        const uid = getUserId(user);

        return uid && previews[uid];
      })
      .filter((user) => {


        const nickname = getDisplayName(user).toLowerCase();
        const originalName = (user.name || "").toLowerCase();
        const email = (user.email || "").toLowerCase();

        return (
          nickname.includes(search) ||
          originalName.includes(search) ||
          email.includes(search)
        );
      })
      .map((user) => {
        const uid = getUserId(user);

        return {
          type: "user",
          id: uid,
          data: user,
          preview: previews[uid],
          sortDate:
            previews[uid]?.createdAt?.toDate?.() ||
            new Date(0),
        };
      });

    const filteredGroups = groups
      .filter((group) => {
        const groupName = (group.name || "").toLowerCase();

        return groupName.includes(search);
      })
      .map((group) => ({
        type: "group",
        id: group.id,
        data: group,
        preview: groupPreviews[group.id],
        sortDate:
          groupPreviews[group.id]?.createdAt?.toDate?.() ||
          group.createdAt?.toDate?.() ||
          new Date(0),
      }));

    chatItems = [...filteredUsers, ...filteredGroups].sort(
      (a, b) => b.sortDate - a.sortDate
    );
  }


  const getPreviewText = (preview) => {
    if (preview?.text?.trim()) {
      return preview.text;
    }

    if (preview?.imageUrl) {
      return "📷 Photo";
    }

    if (preview?.fileUrl) {
      return `📎 ${preview.fileName || "File"}`;
    }

    return "";
  };


  const getGroupSenderName = (senderId) => {
    const currentUser = auth.currentUser;

    if (!senderId) {
      return "";
    }

    if (senderId === currentUser?.uid) {
      return "You";
    }

    const sender = users.find(
      (user) =>
        user.uid === senderId ||
        user.id === senderId
    );

    if (!sender) {
      return "Someone";
    }

    return getDisplayName(sender);
  };

  return (
    <div className="chat-list">

      {chatItems.length === 0 && (
        <p className="no-users">
          No users found
        </p>
      )}

      {chatItems.map((item) => {
        const {
          type,
          id,
          data,
          preview,
        } = item;

        const isGroup = type === "group";

        const displayName = isGroup
          ? data.name || "Group"
          : getDisplayName(data);
        const senderName =
          isGroup && preview?.senderId
            ? getGroupSenderName(preview.senderId)
            : "";

    
        const userId = getUserId(data);

        const unreadCount = !isGroup
          ? unreadCounts[userId] || 0
          : 0;

        return (
          <div
            key={id}
            className="chat-user"
            onClick={() => onSelectUser(data)}
          >

      

            <div className="prof-pic">

              {isGroup ? (
                data.avatar ? (
                  <img
                    src={data.avatar}
                    alt={`${displayName} avatar`}
                    className="profile-avatar"
                  />
                ) : (
                  <span>
                    <FontAwesomeIcon
                      icon={faUserGroup}
                    />
                  </span>
                )
              ) : data.avatar ? (
                <img
                  src={data.avatar}
                  alt={`${displayName}'s avatar`}
                  className="profile-avatar"
                />
              ) : (
                <span>
                  {displayName
                    ?.charAt(0)
                    .toUpperCase()}
                </span>
              )}

            </div>


            <div className="chat-user-info">

              <p className="chat-user-name">
                {displayName}
              </p>

              {preview ? (
                <p className="last-message">

                  {isGroup && senderName
                    ? `${senderName}: `
                    : ""}

                  {getPreviewText(preview)}

                </p>
              ) : (
                <p className="last-message new-chat">
                  {isGroup
                    ? "No messages yet"
                    : "Start a conversation"}
                </p>
              )}

            </div>

      

            <div className="chat-user-meta">

              {preview?.createdAt?.toDate && (
                <span className="last-message-time">
                  {preview.createdAt
                    .toDate()
                    .toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </span>
              )}

              {unreadCount > 0 && (
                <span className="unread-badge">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}

            </div>

          </div>
        );
      })}

    </div>
  );
}