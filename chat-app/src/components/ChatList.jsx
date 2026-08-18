export function Chatlist({
  users,
  onSelectUser,
  previews,
  searchTerm,
}) {
  const search = searchTerm.trim().toLowerCase();

  let chatUsers;

  if (search === "") {
    chatUsers = users
      .filter((user) => previews[user.id])
      .sort((a, b) => {
        const dateA =
          previews[a.id]?.createdAt?.toDate?.() || 0;

        const dateB =
          previews[b.id]?.createdAt?.toDate?.() || 0;

        return dateB - dateA;
      });
  } else {
    chatUsers = users.filter((user) =>
      user.name?.toLowerCase().includes(search)
    );
  }

  return (
    <div className="chat-list">

      {chatUsers.length === 0 && (
        <p className="no-users">
          No users found
        </p>
      )}

      {chatUsers.map((user) => {
        const preview = previews[user.id];

        return (
          <div
            key={user.id}
            className="chat-user"
            onClick={() => onSelectUser(user)}
          >

            <div className="prof-pic">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.name}'s avatar`}
                  className="profile-avatar"
                />
              ) : (
                <span>
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="chat-user-info">
              <p className="chat-user-name">
                {user.name}
              </p>

              {preview ? (
                <p className="last-message">
                  {preview.text}
                </p>
              ) : (
                <p className="last-message new-chat">
                  Start a conversation
                </p>
              )}
            </div>

            {preview?.createdAt && (
              <span className="last-message-time">
                {preview.createdAt
                  .toDate()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </span>
            )}

          </div>
        );
      })}

    </div>
  );
}





