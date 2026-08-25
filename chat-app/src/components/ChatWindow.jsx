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
} from "firebase/firestore";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faEllipsisVertical,
  faChevronUp,
  faChevronDown,
  faCircleInfo,
  faReply,
  faCopy,
  faFaceSmile,
  faShare,
  faThumbtack,
  faStar,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

const getLastSeen = (timestamp) => {
  if (!timestamp?.toDate) {
    return "Last seen recently";
  }

  const lastSeenDate = timestamp.toDate();
  const now = new Date();

  const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);

  if (diffInSeconds < 60) {
    return "Last seen just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);

  if (diffInMinutes < 60) {
    return `Last seen ${diffInMinutes} min ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `Last seen ${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return `Last seen ${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  return `Last seen ${lastSeenDate.toLocaleDateString()}`;
};

function ContextMenu({ x, y, onClose, children }) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: y, left: x });

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
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}

export function ChatWindow({ selectedUser, messages, onSend, onCall }) {
  const currentUser = auth.currentUser;

  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlock, setLoadingBlock] = useState(false);

  const [avatar, setAvatar] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");

  const messageRefs = useRef({});
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
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
      } else {
        setAvatar("");
        setCurrentUserName(currentUser.displayName || "");
        setBlockedUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const isBlocked = selectedUser
    ? blockedUsers.includes(selectedUser.id)
    : false;

  const searchMatches = chatSearch.trim()
    ? messages.filter((message) =>
        message.text?.toLowerCase().includes(chatSearch.toLowerCase().trim()),
      )
    : [];

  useEffect(() => {
    if (chatSearch.trim()) return; // don't fight with search scrolling

    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, selectedUser]);

  useEffect(() => {
    if (!chatSearch.trim() || searchMatches.length === 0) {
      return;
    }

    const currentMatch = searchMatches[currentMatchIndex];

    if (!currentMatch) {
      return;
    }

    const messageElement = messageRefs.current[currentMatch.id];

    if (!messageElement) {
      return;
    }

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

  const handleSend = (text, replyTo) => {
    if (isBlocked) {
      return;
    }

    onSend(text, replyTo);
  };

  const renderAvatar = (image, name, alt) => {
    if (image) {
      return <img src={image} alt={alt} className="message-avatar-image" />;
    }

    return (
      <div className="message-avatar-placeholder">
        {(name || "U").charAt(0).toUpperCase()}
      </div>
    );
  };

  if (!selectedUser) {
    return (
      <div className="chat-window empty-chat">
        <div className="start-conversation">
          <div className="start-icon">💬</div>

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
                aria-label="Previous match"
              >
                <FontAwesomeIcon icon={faChevronUp} />
              </button>

              <button
                type="button"
                onClick={goToNextMatch}
                disabled={searchMatches.length === 0}
                aria-label="Next match"
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
            <div className="prof-pic">
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={`${selectedUser.name}'s avatar`}
                  className="profile-avatar"
                />
              ) : (
                <span>{selectedUser.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="name-status">
              <h3>{selectedUser.name}</h3>

              <p>
                {isBlocked
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

            <div className="chat-more-wrapper">
              <button
                className="chat-more-button"
                type="button"
                onClick={() => setShowMore((prev) => !prev)}
              >
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </button>

              {showMore && (
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
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            {m.text}
          </div>
        ))}
    </div>
  </div>
)}

      <div className="messages" ref={messagesContainerRef}>
        <div className="messages-content">
          {messages.map((message) => {
            const isMyMessage = message.senderId === currentUser?.uid;

            const isCurrentMatch =
              chatSearch.trim() &&
              searchMatches.length > 0 &&
              searchMatches[currentMatchIndex]?.id === message.id;

            return (
              <div
                key={message.id}
                ref={(el) => (messageRefs.current[message.id] = el)}
                className={
                  isMyMessage
                    ? "message-row my-message-row"
                    : "message-row other-message-row"
                }
              >
                {!isMyMessage && (
                  <div className="message-avatar">
                    {renderAvatar(
                      selectedUser.avatar,
                      selectedUser.name,
                      selectedUser.name,
                    )}
                  </div>
                )}

                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedMessage(message);
                    setContextMenu({ x: e.clientX, y: e.clientY });
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
                  {message.replyTo && (
                    <div className="reply-quote">
                      <span>
                        {message.replyTo.senderId === currentUser?.uid
                          ? "You"
                          : selectedUser.name}
                      </span>
                      <p>{message.replyTo.text}</p>
                    </div>
                  )}
                  <p>{message.text}</p>

                  <span>
                    {message.createdAt?.toDate
                      ? message.createdAt.toDate().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
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
            <FontAwesomeIcon icon={faReply} /> Reply
          </button>
          <button type="button" onClick={handleTogglePin}>
            <FontAwesomeIcon icon={faThumbtack} />
            {selectedMessage?.pinned ? "Unpin" : "Pin"}
          </button>
          <button type="button">
            <FontAwesomeIcon icon={faStar} /> Star
          </button>
          <button type="button">
            <FontAwesomeIcon icon={faCircleInfo} /> Message Info
          </button>
          <button
            type="button"
            className="danger"
            onClick={handleDeleteMessage}
          >
            <FontAwesomeIcon icon={faTrash} /> Delete
          </button>
        </ContextMenu>
      )}
      {isBlocked ? (
        <div className="blocked-message">
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
              <div className="reply-preview-content">
                <span className="reply-preview-label">
                  Replying to{" "}
                  {replyingTo.senderId === currentUser?.uid
                    ? "yourself"
                    : selectedUser.name}
                </span>
                <p>{replyingTo.text}</p>
              </div>
              <button
                type="button"
                className="reply-preview-close"
                onClick={() => setReplyingTo(null)}
              >
                ×
              </button>
            </div>
          )}
          <MessageInput
            onSend={(text) => {
              handleSend(text, replyingTo);
              setReplyingTo(null);
            }}
          />
        </>
      )}
    </div>
  );
}
