export default function CallModal({
  selectedUser,
  onEndCall,
}) {
  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        <h2>Calling...</h2>

        <div className="call-avatar">
          {selectedUser?.name?.charAt(0)?.toUpperCase()}
        </div>

        <h3>{selectedUser?.name}</h3>

        <p>Connecting...</p>

        <button
          className="end-call-button"
          onClick={onEndCall}
        >
          End Call
        </button>
      </div>
    </div>
  );
}