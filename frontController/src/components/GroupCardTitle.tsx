import { useState } from 'react';
import { CardTitle } from 'reactstrap'; // adjust import if needed
import { FaTrash } from 'react-icons/fa';
import '../css/styleMsg.css';

const GroupCardTitle = ({ groupItem, sendMessage }) => {
  const { uuid } = groupItem;
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDeleteUuid, setPendingDeleteUuid] = useState<string | null>(null);

  const confirmRemoveGroup = (uuid: string) => {
    setPendingDeleteUuid(uuid);
    setShowConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (sendMessage && pendingDeleteUuid) {
      sendMessage({
        type: 'removeGroup',
        uuid: pendingDeleteUuid,
      });
    }
    setShowConfirm(false);
    setPendingDeleteUuid(null);
  };

  return (
    <>
      <CardTitle className="custom-text-1" tag="h5">
        {`Group: ${groupItem.coordinator.roomName}`}
        {groupItem.connectionStatus === 'offline' && (
          <button className="btn btn-sm btn-danger ms-2" title="Remove Group" onClick={() => confirmRemoveGroup(uuid)}>
            <FaTrash />
          </button>
        )}
      </CardTitle>

      {showConfirm && (
        <div className="modal-backdrop show">
          <div className="modal d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Deletion</h5>
                  <button type="button" className="btn-close" onClick={() => setShowConfirm(false)} />
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to remove this group?</p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={handleConfirmDelete}>
                    Yes, Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupCardTitle;
