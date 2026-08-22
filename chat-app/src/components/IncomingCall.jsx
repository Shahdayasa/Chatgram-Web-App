export default function IncomingCall({
  caller,
  onAccept,
  onReject,
}) {
  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        <h2>Incoming Call</h2>

        <div className="call-avatar">
          {caller?.name?.charAt(0)?.toUpperCase()}
        </div>

        <h3>{caller?.name}</h3>

        <p>Incoming audio call...</p>

        <div className="call-actions">
          <button
            className="reject-call-button"
            onClick={onReject}
          >
            Reject
          </button>

          <button
            className="accept-call-button"
            onClick={onAccept}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}