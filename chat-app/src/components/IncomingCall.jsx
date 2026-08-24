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
          {caller?.avatar ? (
            <img
              src={caller.avatar}
              alt={caller.name || "Caller"}
              className="call-avatar-image"
            />
          ) : (
            caller?.name?.charAt(0)?.toUpperCase() || "?"
          )}
        </div>

        <h3>
          {caller?.name || "Unknown User"}
        </h3>

        <p>
          Incoming audio call...
        </p>

        <div className="call-actions">

          <button
            type="button"
            className="reject-call-button"
            onClick={onReject}
          >
            Reject
          </button>

          <button
            type="button"
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