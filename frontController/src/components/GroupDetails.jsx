import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/styles.css';
import { useState, useEffect } from 'react';
import TimeRangeSelector from './TimeRangeSelector';
import { Card, CardBody, CardTitle, CardText, Table } from 'reactstrap';
import ToggleSwitch from './ToggleSwitch';
import { useWebSocketContext } from '../hooks/WebSocketProvider';
import GroupCardTitle from './GroupCardTitle';

const GroupDetails = ({ group }) => {
  const { sendMessage } = useWebSocketContext();
  const [localGroup, setLocalGroup] = useState(group);
  const [offLineData, setOffLineData] = useState('custom-bg');
  const [hasWorksHours, sethasWorksHours] = useState({});

  useEffect(() => {
    setLocalGroup(group);
  }, [group]);

  useEffect(() => {
    if (localGroup?.type === 'initial' || localGroup?.type === 'update') {
      const updatedWorkHours = Object.values(localGroup.data).reduce((acc, { hasTimePlay, uuid, timeStart, timeStop }) => {
        acc[uuid] = { hasTimePlay, timeStart, timeStop };
        return acc;
      }, {});
      sethasWorksHours(updatedWorkHours);
    }
  }, [localGroup]);

  const setKeepPlayingState = ({ uuid, isKeepPlaying }) => {
    if (sendMessage) {
      const message = {
        type: 'keepPlayerUpdate',
        uuid,
        isKeepPlaying,
      };
      sendMessage(message);
    }
  };

  const updateProp = (data) => {
    const { uuid, ...updatedProps } = data;
    sethasWorksHours((prev) => ({
      ...prev,
      [uuid]: {
        ...prev[uuid],
        ...updatedProps,
      },
    }));
  };

  const setEnableTimeWorkHour = (data) => {
    const { hasTimePlay, uuid, timeStart, timeStop } = data;
    if (sendMessage) {
      const message = {
        type: 'timeFrameUpdate',
        uuid,
        timeStart,
        timeStop,
        hasTimePlay,
      };
      sendMessage(message);
    }
  };

  useEffect(() => {
    console.log('prop', hasWorksHours);
  }, [hasWorksHours]);

  if (!localGroup || !localGroup.data || localGroup.data.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className={`container-fluid my-4 custom-bg-fill ${offLineData}`}>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
        {Object.values(localGroup.data)
          .sort((a, b) => a.coordinator.roomName.localeCompare(b.coordinator.roomName))
          .map((groupItem, index) => {
            const { coordinator, members } = groupItem;
            const { roomName } = coordinator;
            const { state } = members?.[0] || {};
            const { volume = 'unknown', mute = false, playbackState = 'unknown' } = state || {};
            const uuid = groupItem.uuid;

            const isKeepPlaying = groupItem.isKeepPlaying;
            const cardConnectionStatus = groupItem.connectionStatus === 'online' ? 'custom-bg-onLineCard' : 'custom-bg-offLineCard';

            return (
              <div className="col custom-bg-4" key={index}>
                <Card className={`card ${cardConnectionStatus} custom-card`}>
                  <CardBody>
                    <GroupCardTitle groupItem={groupItem} sendMessage={sendMessage} />
                    <CardText className="custom-text-1">
                      <strong>Volume:</strong> {volume}
                    </CardText>
                    <CardText className="custom-text-1">
                      <strong>Mute:</strong> {mute ? 'Yes' : 'No'}
                    </CardText>
                    <CardText className="custom-text-1">
                      <strong>Playback State:</strong> {playbackState}
                    </CardText>

                    <ToggleSwitch label="Always Keep Playing" defaultChecked={isKeepPlaying} onToggle={(isKeepPlaying) => setKeepPlayingState({ uuid, isKeepPlaying })} />

                    <ToggleSwitch
                      label="Audio TimeFrame"
                      defaultChecked={groupItem.hasTimePlay}
                      onToggle={(hasTimePlay) => {
                        updateProp({
                          uuid: groupItem.uuid,
                          hasTimePlay,
                        });
                        setEnableTimeWorkHour({
                          uuid,
                          hasTimePlay,
                          timeStart: groupItem.timeStart,
                          timeStop: groupItem.timeStop,
                        });
                      }}
                    />

                    {hasWorksHours[uuid]?.hasTimePlay && (
                      <TimeRangeSelector
                        label="Select Time Range"
                        defaultStart={groupItem.timeStart}
                        defaultEnd={groupItem.timeStop}
                        onTimeChange={(start, end) =>
                          setEnableTimeWorkHour({
                            uuid,
                            timeStart: start,
                            timeStop: end,
                            hasTimePlay: true,
                          })
                        }
                      />
                    )}

                    <Table bordered responsive className="custom-bg-3">
                      <thead>
                        <tr className="custom-bg-4">
                          <th className="custom-text-3">Room</th>
                          <th className="custom-text-3">Volume</th>
                          <th className="custom-text-3">Mute</th>
                          <th className="custom-text-3">Playback</th>
                        </tr>
                      </thead>
                      <tbody className="custom-bg-4 custom-text-3">
                        {members && members.length > 0 ? (
                          members.map((member, memberIndex) => (
                            <tr key={member.uuid || `member-${memberIndex}`}>
                              <td className="custom-text-3">{member.roomName}</td>
                              <td className="custom-text-3">{member.state.volume}</td>
                              <td className="custom-text-3">{member.state.mute ? 'Yes' : 'No'}</td>
                              <td className="custom-text-3">{member.state.playbackState}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="text-center">
                              No members available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default GroupDetails;
