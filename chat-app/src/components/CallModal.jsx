export default function CallModal({
  selectedUser,
  callState,
  onEndCall,
}) {

    const isConnected = callState === "connected";
  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        <h2>{isConnected ? "Call Connected" : "Calling..."}</h2>

        <div className="call-avatar">
          {selectedUser?.avatar? (
            <img 
            src = {selectedUser?.avatar}
            alt= {selectedUser?.name || "User"}
            className="call-avatar-image"
            />
          ) : (
         selectedUser?.name?.charAt(0)?.toUpperCase() || "?"
          )}
        </div>

        <h3>{selectedUser?.name || "Unkown User"}</h3>

        <p>
            {
                isConnected
                ? "connected"
                : "Waiting for answer..."
            }
        </p>

        <button
          type="button"
          className="end-call-button"
          onClick={onEndCall}
        >
          End Call
        </button>
      </div>
    </div>
  );
}