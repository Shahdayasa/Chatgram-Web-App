import { useEffect, useState, useRef } from "react";
import { MessageInput } from "./MessageInput";
import { auth, db } from "../firebase/firebase";

import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
    addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faMagnifyingGlass,
  faEllipsisVertical,
  faChevronUp,
  faChevronDown,
  faCircleInfo,
  faReply,
  faThumbtack,
  faStar,
  faTrash,
  faXmark,
  faPhone,
  faCheck,
  faPen,
  faImages,
  faUserGroup,
  faUserPlus,
  faRightFromBracket,
  faArrowLeft,
  faCamera,
  faCommentDots,

} from "@fortawesome/free-solid-svg-icons";

const getLastSeen = (timestamp) => {
  if (!timestamp?.toDate) {
    return "Last seen recently";
  }

  const lastSeenDate = timestamp.toDate();
  const now = new Date();
  const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);

  if (diffInSeconds < 60) return "Last seen just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);

  if (diffInMinutes < 60) {
    return `Last seen ${diffInMinutes} min ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `Last seen ${diffInHours} ${
      diffInHours === 1 ? "hour" : "hours"
    } ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return `Last seen ${diffInDays} ${
      diffInDays === 1 ? "day" : "days"
    } ago`;
  }

  return `Last seen ${lastSeenDate.toLocaleDateString()}`;
};

function ContextMenu({ x, y, onClose, children }) {
  const menuRef = useRef(null);

  const [position, setPosition] = useState({
    top: y,
    left: x,
  });

  useEffect(() => {
    if (!menuRef.current) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const padding = 8;

    let top = y;
    let left = x;

    if (top + menuRect.height + padding > window.innerHeight) {
      top = y - menuRect.height;
    }

    if (left + menuRect.width + padding > window.innerWidth) {
      left = x - menuRect.width;
    }

    top = Math.max(
      padding,
      Math.min(top, window.innerHeight - menuRect.height - padding),
    );

    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - menuRect.width - padding),
    );

    setPosition({ top, left });
  }, [x, y]);

  return (
    <>
      <div className="message-context-overlay" onClick={onClose} />

      <div
        ref={menuRef}
        className="message-context-menu"
        style={{
          top: position.top,
          left: position.left,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}

function MessageInfoPanel({ message, selectedUser, users, onClose }) {
  if (!message) return null;

  const currentUser = auth.currentUser;

  const isMyMessage = message.senderId === currentUser?.uid;

  const getUserName = (uid) => {
    if (uid === currentUser?.uid) {
      return "You";
    }

    const user = users?.find((u) => u.uid === uid || u.id === uid);

    return user?.name || selectedUser?.name || "User";
  };

  const deliveredDate = message.deliveredAt?.toDate
    ? message.deliveredAt.toDate()
    : null;

  const readDate = message.readAt?.toDate ? message.readAt.toDate() : null;

  const formatDate = (date) => {
    if (!date) return "";

    return date.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="message-info-slide">
      <div className="message-info-slide-header">
        <button type="button" onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <h3>Message info</h3>
      </div>

      <div className="message-info-slide-content">
        <div className="message-info-message">
          <div
            className={
              isMyMessage
                ? "message-info-bubble my-info-message"
                : "message-info-bubble other-info-message"
            }
          >
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Message"
                className="message-info-image"
              />
            )}

            {message.fileUrl && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="message-file-link"
              >
                📎 {message.fileName || "Download file"}
              </a>
            )}

            {message.text && <p>{message.text}</p>}

            <span className="message-info-time">
              {message.createdAt?.toDate
                ? message.createdAt.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </div>
        </div>

        <div className="message-info-status">
          <div className="message-info-row">
            <div
              className={
                message.read
                  ? "message-info-icon read-icon"
                  : "message-info-icon delivered-icon"
              }
            >
              <FontAwesomeIcon className="first-check" icon={faCheck} />
              <FontAwesomeIcon icon={faCheck} />
            </div>

            <div className="message-info-text">
              <strong>Read</strong>

              <span>
                {message.read ? formatDate(readDate) || "Read" : "Not read"}
              </span>
            </div>
          </div>

          <div className="message-info-row">
            <div
              className={
                message.delivered
                  ? "message-info-icon delivered-icon"
                  : "message-info-icon single-check-icon"
              }
            >
              {message.delivered ? (
                <>
                  <FontAwesomeIcon icon={faCheck} />
                  <FontAwesomeIcon icon={faCheck} />
                </>
              ) : (
                <FontAwesomeIcon icon={faCheck} />
              )}
            </div>

            <div className="message-info-text">
              <strong>Delivered</strong>

              <span>
                {message.delivered
                  ? formatDate(deliveredDate) || "Delivered"
                  : "Not delivered"}
              </span>
            </div>
          </div>
        </div>

        <div className="message-info-sender">
          <span>Sent by</span>

          <strong>{getUserName(message.senderId)}</strong>
        </div>
      </div>
    </div>
  );
}

function ContactInfoPanel({
  user,
  displayName,
  messages,
  onClose,
  onRename,
  onCall,
  onSearch,
}) {
  const [editing, setEditing] = useState(false);

  const [nameInput, setNameInput] = useState(displayName || "");

  const mediaMessages = messages.filter((m) => m.imageUrl);

  const handleSave = () => {
    if (nameInput.trim()) {
      onRename(nameInput.trim());
    }

    setEditing(false);
  };

  return (
    <div className="contact-info-overlay">
      <div className="contact-info-header">
        <button type="button" className="contact-info-close" onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <h3>Contact info</h3>

        <button
          type="button"
          className="contact-info-edit"
          onClick={() => setEditing((prev) => !prev)}
        >
          <FontAwesomeIcon icon={faPen} />
        </button>
      </div>

      <div className="contact-info-body">
        <div className="contact-info-avatar-wrapper">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={displayName}
              className="contact-info-avatar"
            />
          ) : (
            <div className="contact-info-avatar-placeholder">
              {(displayName || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {editing ? (
          <div className="contact-info-name-edit">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
            />

            <button type="button" onClick={handleSave}>
              <FontAwesomeIcon icon={faCheck} />
            </button>
          </div>
        ) : (
          <h2 className="contact-info-name">{displayName}</h2>
        )}

        {user?.phone && <p className="contact-info-phone">{user.phone}</p>}

        <div className="contact-info-actions">
          <button
            type="button"
            className="contact-info-action"
            onClick={onCall}
          >
            <FontAwesomeIcon icon={faPhone} />
          </button>

          <button
            type="button"
            className="contact-info-action"
            onClick={onSearch}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </button>
        </div>

        <div className="contact-info-section">
          <span className="contact-info-section-label">About</span>

          <p className="contact-info-about">
            {user?.about || "Hey there! I am using WhatsApp."}
          </p>
        </div>

        <div className="contact-info-section">
          <div className="contact-info-media-header">
            <FontAwesomeIcon icon={faImages} />

            <span>Media, links and docs</span>

            <span className="contact-info-media-count">
              {mediaMessages.length}
            </span>
          </div>

          {mediaMessages.length > 0 ? (
            <div className="contact-info-media-grid">
              {mediaMessages.map((m) => (
                <img
                  key={m.id}
                  src={m.imageUrl}
                  alt="Media"
                  className="contact-info-media-thumb"
                  onClick={() => window.open(m.imageUrl, "_blank")}
                />
              ))}
            </div>
          ) : (
            <p className="contact-info-no-media">No media shared yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupInfoPanel({
  group,
  users,
  onClose,
  onAddMembers,
  onRemoveMember,
  onExitGroup,
  onUpdateAvatar,
}) {
  const currentUser = auth.currentUser;

  const isAdmin = group.createdBy === currentUser?.uid;

  const [mode, setMode] = useState("info");
  const [search, setSearch] = useState("");
  const [selectedNew, setSelectedNew] = useState([]);
  const [confirmExit, setConfirmExit] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarInputRef = useRef(null);

  const handleGroupAvatarClick = () => {
    if (!isAdmin || uploadingAvatar) return;

    avatarInputRef.current?.click();
  };

  const handleGroupAvatarChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      e.target.value = "";
      return;
    }

    try {
      setUploadingAvatar(true);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("upload_preset", "chat_avatars");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/zhycdkaz/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }

      await onUpdateAvatar?.(data.secure_url);
    } catch (error) {
      console.error("Error updating group avatar:", error);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const getMemberInfo = (uid) => {
    if (uid === currentUser?.uid) {
      return {
        uid,
        name: "You",
        avatar: "",
      };
    }

    const found = users.find((u) => u.uid === uid || u.id === uid);

    return found
      ? {
          ...found,
          uid: found.uid || found.id,
        }
      : {
          uid,
          name: "Unknown",
          avatar: "",
        };
  };

  const members = (group.members || []).map(getMemberInfo);

  const availableContacts = users.filter((u) => {
    const uid = u.uid || u.id;

    if ((group.members || []).includes(uid)) {
      return false;
    }

    const s = search.toLocaleLowerCase().trim();

    if (!s) return true;

    return (
      u.name?.toLocaleLowerCase().includes(s) ||
      u.email?.toLocaleLowerCase().includes(s)
    );
  });

  const toggleNewMember = (contact) => {
    const uid = contact.uid || contact.id;

    setSelectedNew((prev) =>
      prev.some((m) => (m.uid || m.id) === uid)
        ? prev.filter((m) => (m.uid || m.id) !== uid)
        : [...prev, contact],
    );
  };

  const handleAddConfirm = () => {
    if (selectedNew.length === 0) return;

    onAddMembers(selectedNew.map((m) => m.uid || m.id));

    setSelectedNew([]);
    setSearch("");
    setMode("info");
  };

  if (mode === "addMembers") {
    return (
      <div className="contact-info-overlay">
        <div className="contact-info-header">
          <button
            type="button"
            className="contact-info-close"
            onClick={() => setMode("info")}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>

          <h3>Add members</h3>

          <button
            type="button"
            className="contact-info-edit"
            onClick={handleAddConfirm}
            disabled={selectedNew.length === 0}
          >
            <FontAwesomeIcon icon={faCheck} />
          </button>
        </div>

        <div className="group-search-wrapper">
          <div className="contacts-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />

            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {selectedNew.length > 0 && (
            <div className="selected-members-chips">
              {selectedNew.map((m) => (
                <div key={m.uid || m.id} className="selected-member-chip">
                  <span>{m.name}</span>

                  <button type="button" onClick={() => toggleNewMember(m)}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="contacts-list group-add-list">
            {availableContacts.length > 0 ? (
              availableContacts.map((contact) => {
                const uid = contact.uid || contact.id;

                const isSelected = selectedNew.some(
                  (m) => (m.uid || m.id) === uid,
                );

                return (
                  <button
                    key={uid}
                    type="button"
                    className="contact-item"
                    onClick={() => toggleNewMember(contact)}
                  >
                    {contact.avatar ? (
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="contact-avatar"
                      />
                    ) : (
                      <div className="contact-avatar-placeholder">
                        {(contact.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="contact-info">
                      <strong>{contact.name}</strong>

                      <span>{contact.email}</span>
                    </div>

                    <div
                      className={`contact-checkbox ${
                        isSelected ? "checked" : ""
                      }`}
                    >
                      {isSelected && <FontAwesomeIcon icon={faCheck} />}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="contact-info-no-media">No users to add</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-info-overlay">
      <div className="contact-info-header">
        <button type="button" className="contact-info-close" onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <h3>Group info</h3>
      </div>

      <div className="contact-info-body">
        <div
          className="contact-info-avatar-wrapper"
          onClick={handleGroupAvatarClick}
          style={{
            cursor: isAdmin ? "pointer" : "default",
            position: "relative",
          }}
        >
          {group.avatar ? (
            <img
              src={group.avatar}
              alt={group.name}
              className="contact-info-avatar"
            />
          ) : (
            <div className="contact-info-avatar-placeholder">
              <FontAwesomeIcon icon={faUserGroup} />
            </div>
          )}

          {isAdmin && (
            <div
              className="avatar-hover-overlay"
              style={{
                borderRadius: "50%",
              }}
            >
              <FontAwesomeIcon
                icon={faCamera}
                style={{
                  color: "#fff",
                  fontSize: 22,
                }}
              />
            </div>
          )}

          {uploadingAvatar && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 12,
              }}
            >
              Uploading...
            </div>
          )}
        </div>

        {isAdmin && (
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleGroupAvatarChange}
            hidden
          />
        )}

        <h2 className="contact-info-name">{group.name}</h2>

        <p className="contact-info-phone">{members.length} members</p>

        <div className="contact-info-section">
          <div className="contact-info-media-header">
            <FontAwesomeIcon icon={faUserGroup} />

            <span>Members</span>

            <span className="contact-info-media-count">
              {members.length}
            </span>
          </div>

          <button
            type="button"
            className="group-add-members-button"
            onClick={() => setMode("addMembers")}
          >
            <FontAwesomeIcon icon={faUserPlus} />
            Add members
          </button>

          <div className="group-members-list">
            {members.map((member) => (
              <div key={member.uid} className="group-member-row">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="contact-avatar"
                  />
                ) : (
                  <div className="contact-avatar-placeholder">
                    {(member.name || "U").charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="contact-info">
                  <strong>{member.name}</strong>

                  {member.uid === group.createdBy && <span>Admin</span>}
                </div>

                {isAdmin && member.uid !== currentUser?.uid && (
                  <button
                    type="button"
                    className="group-remove-member-button"
                    onClick={() => onRemoveMember(member.uid)}
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="group-exit-button"
          onClick={() => setConfirmExit(true)}
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          Exit group
        </button>
      </div>

      {confirmExit && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h3>Exit group?</h3>

            <p>You will no longer receive messages from this group.</p>

            <div className="confirm-actions">
              <button
                className="cancel-button"
                onClick={() => setConfirmExit(false)}
              >
                Cancel
              </button>

              <button className="confirm-logout-button" onClick={onExitGroup}>
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatWindow({
  selectedUser,
  messages,
  onSend,
  onCall,
  users = [],
  onExitGroup,
  onLoadOlder,
  loadingOlder,
  hasMoreMessages,
}) {
  const currentUser = auth.currentUser;

  const [showMore, setShowMore] = useState(false);

  const [showSearch, setShowSearch] = useState(false);

  const [chatSearch, setChatSearch] = useState("");

  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [blockedUsers, setBlockedUsers] = useState([]);

  const [loadingBlock, setLoadingBlock] = useState(false);

  const [avatar, setAvatar] = useState("");

  const [currentUserName, setCurrentUserName] = useState("");

  const [selectedMessage, setSelectedMessage] = useState(null);

  const [contextMenu, setContextMenu] = useState(null);

  const [replyingTo, setReplyingTo] = useState(null);

  const [showContactInfo, setShowContactInfo] = useState(false);

  const [showMessageInfo, setShowMessageInfo] = useState(false);

  const [contactNames, setContactNames] = useState({});
const [confirmDeleteChat, setConfirmDeleteChat] = useState(false);
  const messageRefs = useRef({});
  const messagesEndRef = useRef(null);
  const moreMenuRef = useRef(null);

  const messagesContainerRef = useRef(null);
const previousScrollHeightRef = useRef(0);
const previousScrollTopRef = useRef(0);
const isLoadingOlderRef = useRef(false);

  useEffect(() => {
    if (!showMore) return;

    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMore(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMore]);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        setAvatar(data.avatar || "");

        setCurrentUserName(data.name || currentUser.displayName || "");

        setBlockedUsers(data.blockedUsers || []);

        setContactNames(data.contactNames || {});
      } else {
        setAvatar("");

        setCurrentUserName(currentUser.displayName || "");

        setBlockedUsers([]);

        setContactNames({});
      }
    });

    return () => unsubscribe();
  }, []);

  const isBlocked =
    selectedUser && !selectedUser.isGroup
      ? blockedUsers.includes(selectedUser.id)
      : false;

  const searchMatches = chatSearch.trim()
    ? messages.filter((message) =>
        message.text
          ?.toLowerCase()
          .includes(chatSearch.toLowerCase().trim()),
      )
    : [];


 useEffect(() => {
  if (chatSearch.trim()) return;

  if (isLoadingOlderRef.current) {
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;

      if (!container) return;

      const newScrollHeight = container.scrollHeight;

      const heightDifference =
        newScrollHeight - previousScrollHeightRef.current;

      container.scrollTop =
        previousScrollTopRef.current + heightDifference;

      isLoadingOlderRef.current = false;
    });

    return;
  }

  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({
      behavior: "auto",
    });
  }
}, [messages, selectedUser]);

  useEffect(() => {
    if (!chatSearch.trim() || searchMatches.length === 0) {
      return;
    }

    const currentMatch = searchMatches[currentMatchIndex];

    if (!currentMatch) return;

    const messageElement = messageRefs.current[currentMatch.id];

    if (!messageElement) return;

    requestAnimationFrame(() => {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [chatSearch, currentMatchIndex, searchMatches]);

  const goToNextMatch = () => {
    if (searchMatches.length === 0) return;

    setCurrentMatchIndex((prev) =>
      prev + 1 >= searchMatches.length ? 0 : prev + 1,
    );
  };

  const goToPrevMatch = () => {
    if (searchMatches.length === 0) return;

    setCurrentMatchIndex((prev) =>
      prev - 1 < 0 ? searchMatches.length - 1 : prev - 1,
    );
  };

  const closeSearch = () => {
    setShowSearch(false);
    setChatSearch("");
    setCurrentMatchIndex(0);
  };

  const handleBlockToggle = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser || !selectedUser || loadingBlock) {
      return;
    }

    try {
      setLoadingBlock(true);

      const userRef = doc(db, "users", currentUser.uid);

      if (isBlocked) {
        await updateDoc(userRef, {
          blockedUsers: arrayRemove(selectedUser.id),
        });
      } else {
        await updateDoc(userRef, {
          blockedUsers: arrayUnion(selectedUser.id),
        });
      }

      setShowMore(false);
    } catch (error) {
      console.error("Error updating block status:", error);
    } finally {
      setLoadingBlock(false);
    }
  };


const handleMessagesScroll = async (e) => {
  const container = e.currentTarget;

  if (
    container.scrollTop > 50 ||
    loadingOlder ||
    !hasMoreMessages ||
    isLoadingOlderRef.current
  ) {
    return;
  }

  isLoadingOlderRef.current = true;

  previousScrollTopRef.current = container.scrollTop;
  previousScrollHeightRef.current = container.scrollHeight;

  try {
    await onLoadOlder?.();
  } catch (error) {
    console.error("Error loading older messages:", error);
    isLoadingOlderRef.current = false;
  }
};

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;

    try {
      await deleteDoc(doc(db, "messages", selectedMessage.id));
    } catch (error) {
      console.error("Error deleting message:", error);
    } finally {
      setSelectedMessage(null);
      setContextMenu(null);
    }
  };

const handleDeleteChat = async () => {
  const currentUser = auth.currentUser;

  if (!currentUser || !selectedUser) {
    return;
  }

  try {
    const otherUserId = selectedUser.uid || selectedUser.id;

    const sentQuery = query(
      collection(db, "messages"),
      where("senderId", "==", currentUser.uid),
      where("receiverId", "==", otherUserId),
    );

    const receivedQuery = query(
      collection(db, "messages"),
      where("senderId", "==", otherUserId),
      where("receiverId", "==", currentUser.uid),
    );

    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      getDocs(sentQuery),
      getDocs(receivedQuery),
    ]);

    const batch = writeBatch(db);

    sentSnapshot.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });

    receivedSnapshot.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });

    await batch.commit();

    setShowMore(false);
  } catch (error) {
    console.error("Error deleting chat:", error);
  } finally {
    setConfirmDeleteChat(false);
  }
};
  const handleTogglePin = async () => {
    if (!selectedMessage) return;

    try {
      await updateDoc(doc(db, "messages", selectedMessage.id), {
        pinned: !selectedMessage.pinned,
      });
    } catch (error) {
      console.error("Error toggling pin:", error);
    } finally {
      setSelectedMessage(null);
      setContextMenu(null);
    }
  };

  const handleToggleStar = async () => {
    if (!selectedMessage || !currentUser) {
      return;
    }

    const isStarred = selectedMessage.starredBy?.includes(currentUser.uid);

    try {
      await updateDoc(doc(db, "messages", selectedMessage.id), {
        starredBy: isStarred
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
      });
    } catch (error) {
      console.error("Error toggling star:", error);
    } finally {
      setSelectedMessage(null);
      setContextMenu(null);
    }
  };

  const displayName = selectedUser
    ? selectedUser.isGroup
      ? selectedUser.name
      : contactNames[selectedUser.uid] || selectedUser.name
    : "";

  const handleRenameContact = async (newName) => {
    if (!currentUser || !selectedUser || !newName.trim()) {
      return;
    }

    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        [`contactNames.${selectedUser.uid}`]: newName.trim(),
      });
    } catch (error) {
      console.error("Error renaming contact:", error);
    }
  };

  const handleAddGroupMembers = async (memberIds) => {
    if (!selectedUser?.isGroup) return;

    try {
      await updateDoc(doc(db, "groups", selectedUser.id), {
        members: arrayUnion(...memberIds),
      });
    } catch (error) {
      console.error("Error adding group members:", error);
    }
  };

  const handleRemoveGroupMember = async (memberId) => {
    if (!selectedUser?.isGroup) return;

    try {
      await updateDoc(doc(db, "groups", selectedUser.id), {
        members: arrayRemove(memberId),
      });
    } catch (error) {
      console.error("Error removing group member:", error);
    }
  };

  const handleExitGroup = async () => {
    if (!selectedUser?.isGroup || !currentUser) {
      return;
    }

    try {
      await updateDoc(doc(db, "groups", selectedUser.id), {
        members: arrayRemove(currentUser.uid),
      });

      setShowContactInfo(false);

      onExitGroup?.();
    } catch (error) {
      console.error("Error exiting group:", error);
    }
  };

  const handleUpdateGroupAvatar = async (newAvatarUrl) => {
    if (!selectedUser?.isGroup) return;

    try {
      await updateDoc(doc(db, "groups", selectedUser.id), {
        avatar: newAvatarUrl,
      });
    } catch (error) {
      console.error("Error updating group avatar:", error);
    }
  };

  const handleSend = (text, replyTo) => {
    if (isBlocked) return;

    onSend(text, replyTo);
  };

  const renderAvatar = (image, name, alt) => {
    if (image) {
      return (
        <img src={image} alt={alt} className="message-avatar-image" />
      );
    }

    return (
      <div className="message-avatar-placeholder">
        {(name || "U").charAt(0).toUpperCase()}
      </div>
    );
  };

  const getSenderInfo = (senderId) => {
    if (!selectedUser?.isGroup) {
      return selectedUser || {};
    }

    const found = users.find((u) => u.uid === senderId || u.id === senderId);

    return (
      found || {
        name: "Unknown",
        avatar: "",
      }
    );
  };

if (!selectedUser) {
  return (
    <div className="chat-window empty-chat">
      <div className="start-conversation">
        <div className="start-icon">
          <FontAwesomeIcon icon={faCommentDots} />
        </div>

        <h2>Start a new conversation</h2>
        <p>Select a user from the chat list to start chatting.</p>
      </div>
    </div>
  );
}

  return (
    <div className="chat-window">
      {showSearch ? (
        <div className="chat-search-header">
          <div className="chat-search-box">
            <FontAwesomeIcon icon={faMagnifyingGlass} />

            <input
              type="text"
              placeholder="Search"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              autoFocus
            />
          </div>

          {chatSearch.trim() && (
            <div className="chat-search-nav">
              <span className="chat-search-count">
                {searchMatches.length > 0
                  ? `${currentMatchIndex + 1} of ${searchMatches.length}`
                  : "0 of 0"}
              </span>

              <button
                type="button"
                onClick={goToPrevMatch}
                disabled={searchMatches.length === 0}
              >
                <FontAwesomeIcon icon={faChevronUp} />
              </button>

              <button
                type="button"
                onClick={goToNextMatch}
                disabled={searchMatches.length === 0}
              >
                <FontAwesomeIcon icon={faChevronDown} />
              </button>
            </div>
          )}

          <button
            className="chat-search-cancle"
            onClick={closeSearch}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="chat-header">
          <div className="prof-name-seen">
            <div
              className="prof-pic"
              onClick={() => setShowContactInfo(true)}
              style={{
                cursor: "pointer",
              }}
            >
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={`${displayName}'s avatar`}
                  className="profile-avatar"
                />
              ) : selectedUser.isGroup ? (
                <FontAwesomeIcon
                  icon={faUserGroup}
                  style={{
                    color: "#ffffff",
                  }}
                />
              ) : (
                <span>{displayName?.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="name-status">
              <h3>{displayName}</h3>

              <p>
                {selectedUser.isGroup
                  ? `${selectedUser.members?.length || 0} members`
                  : isBlocked
                    ? "Blocked"
                    : selectedUser.isOnline
                      ? "Online"
                      : getLastSeen(selectedUser.lastSeen)}
              </p>
            </div>
          </div>

          <div className="additional">
            <button
              className="chat-search-button"
              type="button"
              onClick={() => setShowSearch(true)}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>

            {!selectedUser.isGroup && (
              <button
                className="chat-phone-button"
                aria-label="Call"
                type="button"
                onClick={onCall}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.772 10.439L16.848 10.095C17.858 9.77299 18.935 10.294 19.368 11.312L20.227 13.34C20.601 14.223 20.394 15.262 19.713 15.908L17.819 17.706C17.935 18.782 18.297 19.841 18.903 20.883C19.4788 21.8912 20.251 22.7736 21.174 23.478L23.449 22.718C24.312 22.431 25.251 22.762 25.779 23.539L27.012 25.349C27.627 26.253 27.517 27.499 26.754 28.265L25.936 29.086C25.122 29.903 23.959 30.2 22.884 29.864C20.345 29.072 18.011 26.721 15.881 22.811C13.748 18.895 12.995 15.571 13.623 12.843C13.887 11.695 14.704 10.78 15.772 10.439Z"
                    fill="#707991"
                  />
                </svg>
              </button>
            )}

            <div className="chat-more-wrapper" ref={moreMenuRef}>
              <button
                className="chat-more-button"
                type="button"
                onClick={() => setShowMore((prev) => !prev)}
              >
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </button>

              {showMore && !selectedUser.isGroup && (
                <div className="chat-more-menu">
                  <button
                    type="button"
                    onClick={handleBlockToggle}
                    disabled={loadingBlock}
                  >
                    {loadingBlock
                      ? "Please wait..."
                      : isBlocked
                        ? "Unblock User"
                        : "Block User"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {messages.some((m) => m.pinned) && (
        <div className="pinned-bar">
          <FontAwesomeIcon icon={faThumbtack} />

          <div className="pinned-bar-list">
            {messages
              .filter((m) => m.pinned)
              .map((m) => (
                <div
                  key={m.id}
                  className="pinned-bar-item"
                  onClick={() => {
                    const el = messageRefs.current[m.id];

                    el?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                >
                  {m.text || "Media"}
                </div>
              ))}
          </div>
        </div>
      )}

      <div
        className="messages"
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
      >
        <div className="messages-content">
          {loadingOlder && (
            <div className="older-messages-loading">
              <div className="loading-spinner"></div>
            </div>
          )}

          {messages.map((message) => {
              if (message.type === "system") {
    return (
      <div key={message.id} className="system-message">
        <span>{message.text}</span>
      </div>
    );
  }
            const isMyMessage = message.senderId === currentUser?.uid;

            const sender = getSenderInfo(message.senderId);

            const isCurrentMatch =
              chatSearch.trim() &&
              searchMatches.length > 0 &&
              searchMatches[currentMatchIndex]?.id === message.id;

            return (
              <div
                key={message.id}
                ref={(el) => {
                  messageRefs.current[message.id] = el;
                }}
                className={
                  isMyMessage
                    ? "message-row my-message-row"
                    : "message-row other-message-row"
                }
              >
                {!isMyMessage && (
                  <div className="message-avatar">
                    {renderAvatar(sender.avatar, sender.name, sender.name)}
                  </div>
                )}

                <div
                  onContextMenu={(e) => {
                    e.preventDefault();

                    setSelectedMessage(message);

                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  className={
                    (isMyMessage
                      ? "message my-message"
                      : "message other-message") +
                    (isCurrentMatch ? " message-highlighted" : "")
                  }
                  style={{
                    transform:
                      selectedMessage?.id === message.id
                        ? "scale(1.06)"
                        : "scale(1)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  {!isMyMessage && selectedUser.isGroup && (
                    <span className="message-sender-name">
                      {sender.name}
                    </span>
                  )}

                  {message.replyTo && (
                    <div className="reply-quote">
                      <span>
                        {message.replyTo.senderId === currentUser?.uid
                          ? "You"
                          : displayName}
                      </span>

                      <p>{message.replyTo.text}</p>
                    </div>
                  )}

                  {message.imageUrl && (
                    <img
                      src={message.imageUrl}
                      alt="Sent image"
                      className="message-image"
                      onClick={() => window.open(message.imageUrl, "_blank")}
                    />
                  )}

                  {message.fileUrl && (
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="message-file-link"
                    >
                      📎 {message.fileName || "Download file"}
                    </a>
                  )}

                  {message.text && <p>{message.text}</p>}

                  <div className="message-meta">
                    {message.starredBy?.includes(currentUser?.uid) && (
                      <FontAwesomeIcon
                        icon={faStar}
                        className="message-star-icon"
                      />
                    )}

                    {isMyMessage && (
                      <>
                        <span>
                          {message.createdAt?.toDate
                            ? message.createdAt
                                .toDate()
                                .toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                            : ""}
                        </span>

                        <span
                          className={
                            message.read
                              ? "message-ticks read"
                              : message.delivered
                                ? "message-ticks delivered"
                                : "message-ticks sent"
                          }
                        >
                          {message.delivered || message.read ? (
                            <>
                              <FontAwesomeIcon icon={faCheck} />

                              <FontAwesomeIcon icon={faCheck} />
                            </>
                          ) : (
                            <FontAwesomeIcon icon={faCheck} />
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {isMyMessage && (
                  <div className="message-avatar">
                    {renderAvatar(
                      avatar,
                      currentUserName ||
                        currentUser?.displayName ||
                        currentUser?.email,
                      "You",
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {selectedMessage && contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => {
            setSelectedMessage(null);
            setContextMenu(null);
          }}
        >
          <button
            type="button"
            onClick={() => {
              setReplyingTo(selectedMessage);

              setSelectedMessage(null);
              setContextMenu(null);
            }}
          >
            <FontAwesomeIcon icon={faReply} />
            Reply
          </button>

          <button type="button" onClick={handleTogglePin}>
            <FontAwesomeIcon icon={faThumbtack} />
            {selectedMessage.pinned ? "Unpin" : "Pin"}
          </button>

          <button type="button" onClick={handleToggleStar}>
            <FontAwesomeIcon icon={faStar} />
            {selectedMessage.starredBy?.includes(currentUser?.uid)
              ? "Unstar"
              : "Star"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowMessageInfo(true);
              setContextMenu(null);
            }}
          >
            <FontAwesomeIcon icon={faCircleInfo} />
            Message Info
          </button>

          <button
            type="button"
            className="danger"
            onClick={handleDeleteMessage}
          >
            <FontAwesomeIcon icon={faTrash} />
            Delete
          </button>
        </ContextMenu>
      )}

      {showMessageInfo && selectedMessage && (
        <MessageInfoPanel
          message={selectedMessage}
          selectedUser={selectedUser}
          users={users}
          onClose={() => {
            setShowMessageInfo(false);
            setSelectedMessage(null);
          }}
        />
      )}

      {showContactInfo &&
        (selectedUser.isGroup ? (
          <GroupInfoPanel
            group={selectedUser}
            users={users}
            onClose={() => setShowContactInfo(false)}
            onAddMembers={handleAddGroupMembers}
            onRemoveMember={handleRemoveGroupMember}
            onExitGroup={handleExitGroup}
            onUpdateAvatar={handleUpdateGroupAvatar}
          />
        ) : (
          <ContactInfoPanel
            user={selectedUser}
            displayName={displayName}
            messages={messages}
            onClose={() => setShowContactInfo(false)}
            onRename={handleRenameContact}
            onCall={() => {
              setShowContactInfo(false);
              onCall();
            }}
            onSearch={() => {
              setShowContactInfo(false);
              setShowSearch(true);
            }}
          />
        ))}

      {isBlocked ? (
        <div className="blocked-message">
          <button
            type="button"
            className="delete-chat"
            onClick={() => setConfirmDeleteChat(true)}
          >
            Delete chat
          </button>

          <button
            type="button"
            className="unblock-button"
            onClick={handleBlockToggle}
            disabled={loadingBlock}
          >
            {loadingBlock ? "Please wait..." : "Unblock"}
          </button>
        </div>
      ) : (
        <>
          {replyingTo && (
            <div className="reply-preview">
              ...
            </div>
          )}

          <MessageInput
            onSend={(payload) => {
              handleSend(payload, replyingTo);
              setReplyingTo(null);
            }}
          />
        </>
      )}

      {confirmDeleteChat && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h3>Are you sure you want to Delete this chat?</h3>
            <div className="confirm-actions">
              <button
                className="cancel-button"
                onClick={() => setConfirmDeleteChat(false)}
              >
                Cancel
              </button>
              <button className="confirm-logout-button" onClick={handleDeleteChat}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}