import { useEffect, useState } from "react";
import { MessageInput } from "./MessageInput";
import { auth, db } from "../firebase/firebase";

import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faEllipsisVertical,
} from "@fortawesome/free-solid-svg-icons";

export function ChatWindow({ selectedUser, messages, onSend }) {
  const currentUser = auth.currentUser;

  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearch, setChatSearch] = useState("");

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlock, setLoadingBlock] = useState(false);

  const [avatar, setAvatar] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        setAvatar(data.avatar || "");
        setCurrentUserName(
          data.name || currentUser.displayName || ""
        );

        setBlockedUsers(data.blockedUsers || []);
      } else {
        setAvatar("");
        setCurrentUserName(
          currentUser.displayName || ""
        );
        setBlockedUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const isBlocked = selectedUser
    ? blockedUsers.includes(selectedUser.id)
    : false;

  const searchResults = chatSearch.trim()
    ? messages.filter((message) =>
        message.text
          ?.toLowerCase()
          .includes(chatSearch.toLowerCase().trim())
      )
    : [];

  const closeSearch = () => {
    setShowSearch(false);
    setChatSearch("");
  };

  const handleBlockToggle = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser || !selectedUser || loadingBlock) {
      return;
    }

    try {
      setLoadingBlock(true);

      const userRef = doc(
        db,
        "users",
        currentUser.uid
      );

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
      console.error(
        "Error updating block status:",
        error
      );
    } finally {
      setLoadingBlock(false);
    }
  };

  const handleSend = (text) => {
    if (isBlocked) {
      return;
    }

    onSend(text);
  };

  const renderAvatar = (
    image,
    name,
    alt
  ) => {
    if (image) {
      return (
        <img
          src={image}
          alt={alt}
          className="message-avatar-image"
        />
      );
    }

    return (
      <div className="message-avatar-placeholder">
        {(name || "U")
          .charAt(0)
          .toUpperCase()}
      </div>
    );
  };

  if (!selectedUser) {
    return (
      <div className="chat-window empty-chat">
        <div className="start-conversation">
          <div className="start-icon">💬</div>

          <h2>Start a new conversation</h2>

          <p>
            Select a user from the chat list to start chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">

      {showSearch ? (
        <div className="chat-search-header">

          <div className="chat-search-box">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
            />

            <input
              type="text"
              placeholder="Search"
              value={chatSearch}
              onChange={(e) =>
                setChatSearch(e.target.value)
              }
              autoFocus
            />
          </div>

          <button
            className="chat-search-cancle"
            onClick={closeSearch}
            type="button"
          >
            Cancel
          </button>

          {chatSearch.trim() && (
            <div className="chat-search-results">

              {searchResults.length > 0 ? (
                searchResults.map((message) => {
                  const isMyMessage =
                    message.senderId ===
                    currentUser?.uid;

                  return (
                    <div
                      key={message.id}
                      className="chat-search-result"
                    >

                      <div className="chat-search-result-avatar">
                        {isMyMessage
                          ? renderAvatar(
                              avatar,
                              currentUserName,
                              "You"
                            )
                          : renderAvatar(
                              selectedUser.avatar,
                              selectedUser.name,
                              selectedUser.name
                            )}
                      </div>

                      <div className="chat-search-result-content">

                        <p>{message.text}</p>

                        <span>
                          {message.createdAt?.toDate
                            ? message.createdAt
                                .toDate()
                                .toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                            : ""}
                        </span>

                      </div>

                    </div>
                  );
                })
              ) : (
                <div className="no-message-results">
                  No messages found
                </div>
              )}

            </div>
          )}

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
                <span>
                  {selectedUser.name
                    ?.charAt(0)
                    .toUpperCase()}
                </span>
              )}

            </div>

            <div className="name-status">

              <h3>{selectedUser.name}</h3>

              <p>
                {isBlocked
                  ? "Blocked"
                  : selectedUser.isOnline
                  ? "Online"
                  : "Offline"}
              </p>

            </div>

          </div>

          <div className="additional">

            <button
              className="chat-search-button"
              type="button"
              onClick={() =>
                setShowSearch(true)
              }
            >
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
              />
            </button>

            <button
              className="chat-phone-button"
              aria-label="Call"
              type="button"
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
                onClick={() =>
                  setShowMore((prev) => !prev)
                }
              >
                <FontAwesomeIcon
                  icon={faEllipsisVertical}
                />
              </button>

              {showMore && (
                <div className="chat-more-menu">

                  <button
                    type="button"
                    onClick={
                      handleBlockToggle
                    }
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

      <div className="messages">

        {messages.map((message) => {

          const isMyMessage =
            message.senderId ===
            currentUser?.uid;

          return (
            <div
              key={message.id}
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
                    selectedUser.name
                  )}
                </div>
              )}

              <div
                className={
                  isMyMessage
                    ? "message my-message"
                    : "message other-message"
                }
              >

                <p>{message.text}</p>

                <span>
                  {message.createdAt?.toDate
                    ? message.createdAt
                        .toDate()
                        .toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
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
                    "You"
                  )}
                </div>
              )}

            </div>
          );
        })}

        {isBlocked ? (
          <div className="blocked-message">

            <button
              type="button"
              className="unblock-button"
              onClick={handleBlockToggle}
              disabled={loadingBlock}
            >
              {loadingBlock
                ? "Please wait..."
                : "Unblock"}
            </button>

          </div>
        ) : (
          <MessageInput
            onSend={handleSend}
          />
        )}

      </div>

    </div>
  );
}