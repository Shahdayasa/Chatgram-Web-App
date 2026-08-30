export default function CallModal({
  selectedUser,
  callState,
  onEndCall,
  isSpeaking,
  users = [],
  callParticipants = [],
  ringingUids = [],
  showParticipants = false,
  setShowParticipants,
  onAddParticipant,
}) {
  const isConnected = callState === "connected";

  const ringingUsers = users.filter((user) =>
    ringingUids.includes(user.uid)
  );

  const isGroupCall = callParticipants.length + ringingUsers.length > 2;

  const avatarStack = [
    ...callParticipants,
    ...ringingUsers.map((user) => ({ ...user, isRinging: true })),
  ];

  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        <h2>{isConnected ? "Call Connected" : "Calling..."}</h2>

        {isGroupCall ? (
          <>
            <div className="call-avatar-stack">
              {avatarStack.slice(0, 5).map((participant, index) => (
                <div
                  key={participant.uid}
                  className={`call-avatar-stack-item ${
                    participant.isRinging ? "ringing" : ""
                  }`}
                  style={{ zIndex: avatarStack.length - index }}
                >
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.name || "User"}
                    />
                  ) : (
                    participant.name?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>
              ))}

              {avatarStack.length > 5 && (
                <div className="call-avatar-stack-item call-avatar-stack-more">
                  +{avatarStack.length - 5}
                </div>
              )}
            </div>

            <h3>Group Call</h3>

            <p>
              {isConnected
                ? `${callParticipants.length} connected`
                : "Waiting for answer..."}
            </p>
          </>
        ) : (
          <>
            <div className="call-avatar">
              {selectedUser?.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name || "User"}
                  className="call-avatar-image"
                />
              ) : (
                selectedUser?.name?.charAt(0)?.toUpperCase() || "?"
              )}
            </div>

            <h3>{selectedUser?.name || "Unknown User"}</h3>

            <p>{isConnected ? "Connected" : "Waiting for answer..."}</p>
          </>
        )}

        {isConnected && (
          <div className={`speaking-indicator ${isSpeaking ? "active" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {isConnected && (
          <div className="participants-section">
            <button
              type="button"
              className="add-participant-button"
              onClick={() => setShowParticipants((prev) => !prev)}
            >
              + Add participants
            </button>

            {showParticipants && (
              <div className="participants-dropdown">
                <h4>Add participant</h4>

                {users.filter((user) => !ringingUids.includes(user.uid))
                  .length === 0 ? (
                  <div className="no-users">No users available</div>
                ) : (
                  <div className="participants-list">
                    {users
                      .filter((user) => !ringingUids.includes(user.uid))
                      .map((user) => (
                        <button
                          type="button"
                          key={user.uid || user.id}
                          className="participant-item"
                          onClick={() => onAddParticipant(user)}
                        >
                          <div className="participant-avatar">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} />
                            ) : (
                              user.name?.charAt(0)?.toUpperCase() || "?"
                            )}
                          </div>

                          <span>{user.name || "Unknown User"}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {ringingUsers.length > 0 && (
          <div className="current-participants">
            <h4>Calling</h4>

            {ringingUsers.map((user) => (
              <div key={user.uid} className="current-participant ringing">
                <div className="current-participant-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    user.name?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>

                <span>{user.name || "User"}</span>
              </div>
            ))}
          </div>
        )}

        {callParticipants.length > 0 && (
          <div className="current-participants">
            <h4>Participants</h4>

            {callParticipants.map((participant) => (
              <div key={participant.uid} className="current-participant">
                <div className="current-participant-avatar">
                  {participant.avatar ? (
                    <img src={participant.avatar} alt={participant.name} />
                  ) : (
                    participant.name?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>

                <span>{participant.name || "User"}</span>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="end-call-button" onClick={onEndCall}>
          End Call
        </button>
      </div>
    </div>
  );
}