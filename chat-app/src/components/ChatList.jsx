import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { auth } from "../firebase/firebase";

export function Chatlist({
  users,
  groups = [],
  onSelectUser,
  previews,
  groupPreviews = {},
  searchTerm,
  unreadCounts = {},
}) {
  const search = searchTerm.trim().toLowerCase();

  // بس الأشخاص اللي في preview إلهم (يعني حكيت معهم)
  const userItems = users
    .filter((user) => previews[user.id])
    .map((user) => ({
      type: "user",
      id: user.id,
      data: user,
      preview: previews[user.id],
      sortDate: previews[user.id]?.createdAt?.toDate?.() || new Date(0),
    }));

  // كل الجروبات، مرتبة حسب تاريخ إنشاء الجروب نفسه (مش آخر رسالة)
  const groupItems = groups.map((group) => ({
    type: "group",
    id: group.id,
    data: group,
    preview: groupPreviews[group.id],
    sortDate: group.createdAt?.toDate?.() || new Date(0),
  }));

  let chatItems;

  if (search === "") {
    chatItems = [...userItems, ...groupItems].sort(
      (a, b) => b.sortDate - a.sortDate,
    );
  } else {
    const filteredUsers = users
      .filter((user) => previews[user.id])
      .filter((user) => user.name?.toLowerCase().includes(search))
      .map((user) => ({
        type: "user",
        id: user.id,
        data: user,
        preview: previews[user.id],
      }));

    const filteredGroups = groups
      .filter((group) => group.name?.toLowerCase().includes(search))
      .map((group) => ({
        type: "group",
        id: group.id,
        data: group,
        preview: groupPreviews[group.id],
      }));

    chatItems = [...filteredUsers, ...filteredGroups];
  }

  const getPreviewText = (preview) => {
    if (preview?.text?.trim()) return preview.text;
    if (preview?.imageUrl) return "📷 Photo";
    if (preview?.fileUrl) {
      return `📎 ${preview.fileName || "File"}`;
    }
    return "";
  };

  return (
    <div className="chat-list">
      {chatItems.length === 0 && (
        <p className="no-users">No users found</p>
      )}

      {chatItems.map((item) => {
        const { type, id, data, preview } = item;
        const isGroup = type === "group";

        const currentUser = auth.currentUser;

        const senderName =
          isGroup && preview?.senderId
            ? preview.senderId === currentUser?.uid
              ? "You"
              : users.find(
                  (u) =>
                    u.uid === preview.senderId ||
                    u.id === preview.senderId,
                )?.name || "Someone"
            : "";

const unreadCount = !isGroup ? unreadCounts[data.uid] || 0 : 0;
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
                    alt={`${data.name} avatar`}
                    className="profile-avatar"
                  />
                ) : (
                  <span>
                    <FontAwesomeIcon icon={faUserGroup} />
                  </span>
                )
              ) : data.avatar ? (
                <img
                  src={data.avatar}
                  alt={`${data.name}'s avatar`}
                  className="profile-avatar"
                />
              ) : (
                <span>
                  {data.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="chat-user-info">
              <p className="chat-user-name">{data.name}</p>

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
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}