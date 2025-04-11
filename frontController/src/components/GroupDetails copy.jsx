import "bootstrap/dist/css/bootstrap.min.css";
import "../css/styles.css";
import { useState, useEffect } from "react";
import TimeRangeSelector from "./TimeRangeSelector";
import { Card, CardBody, CardTitle, CardText, Table } from "reactstrap"; // Bootstrap components
import ToggleSwitch from "./ToggleSwitch";
import { useWebSocketContext } from "../hooks/WebSocketProvider";

const GroupDetails = ({ group }) => {
  const [groups, setGroups] = useState();
  const { messages, sendMessage } = useWebSocketContext();
  const [localGroup, setLocalGroup] = useState(group);
  const [offLineData, setOffLineData] = useState("custom-bg");
  const [hasWorksHours, sethasWorksHours] = useState({});
  const [keepPlayingStates, setKeepPlayingStates] = useState({});

  useEffect(() => {
    console.log("messages", messages);
    if (messages && messages[0]) {
      const updatedGroups = messages[0];
      if (updatedGroups && updatedGroups.uuid === group.uuid) {
        setLocalGroup((prevGroup) => ({
          ...prevGroup,
          data: updatedGroups.data ?? prevGroup.data,
          type: updatedGroups.type ?? prevGroup.type,
        }));
      }
    }
  }, [messages]);

  useEffect(() => {
    setLocalGroup(group);
  }, [group]);

  if (!localGroup || !localGroup.data || localGroup.data.length === 0) {
    return <div>Loading...</div>;
  }

  useEffect(() => {
    if (group.type === "initial" || group.type === "update") {
      const updatedWorkHours = Object.values(group.data).reduce(
        (acc, { hasTimePlay, uuid, timeStart, timeStop }) => {
          acc[uuid] = { hasTimePlay, timeStart, timeStop };
          return acc;
        },
        {}
      );
      sethasWorksHours(updatedWorkHours);
    }
  }, [group.data]);

  const setKeepPlayingState = ({ uuid, isKeepPlaying }) => {
    setKeepPlayingStates((prev) => ({ ...prev, [uuid]: isKeepPlaying }));
    if (sendMessage) {
      const message = {
        type: "keepPlayerUpdate",
        uuid,
        isKeepPlaying,
      };
      sendMessage(message);
    }
  };

  // Updates the working hours for a specific group
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
        type: "timeFrameUpdate",
        uuid,
        timeStart,
        timeStop,
        hasTimePlay,
      };
      sendMessage(message);
    }
  };

  useEffect(() => {
    if (group.offLineData) {
      setOffLineData("custom-bg-offline");
    }
  }, []);

  useEffect(() => {
    console.log("prop", hasWorksHours);
  }, [hasWorksHours]);

  return (
    <div className={`container-fluid my-4 custom-bg ${offLineData}`}>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
        {Object.values(localGroup.data)
          .sort((a, b) =>
            a.coordinator.roomName.localeCompare(b.coordinator.roomName)
          )
          .map((groupItem, index) => {
            const { coordinator, members } = groupItem;
            const { roomName } = coordinator;
            const { state } = members?.[0] || {};
            const {
              volume = "unknown",
              mute = false,
              playbackState = "unknown",
            } = state || {};
            const uuid = groupItem.uuid;
            console.log("Props hasWorksHours:", hasWorksHours[uuid]);
            console.log("Props groupItem.hasTimePlay:", groupItem.hasTimePlay);

            const isKeepPlaying = groupItem.keepPlaying;
            const cardConnectionStatus =
              groupItem.connectionStatus === "online"
                ? "custom-bg-onLineCard"
                : "custom-bg-offLineCard";

            return (
              <div className="col custom-bg-4" key={index}>
                <Card className={`card ${cardConnectionStatus} custom-card`}>
                  <CardBody>
                    <CardTitle
                      className="custom-text-1"
                      tag="h5"
                    >{`Group: ${roomName}`}</CardTitle>
                    <CardText className="custom-text-1">
                      <strong>Volume:</strong> {volume}
                    </CardText>
                    <CardText className="custom-text-1">
                      <strong>Mute:</strong> {mute ? "Yes" : "No"}
                    </CardText>
                    <CardText className="custom-text-1">
                      <strong>Playback State:</strong> {playbackState}
                    </CardText>
                    <ToggleSwitch
                      label="Always Keep Playing"
                      defaultChecked={isKeepPlaying}
                      onToggle={(isKeepPlaying) =>
                        setKeepPlayingState({ uuid, isKeepPlaying })
                      }
                    />

                    <ToggleSwitch
                      label="Audio Timeframe"
                      defaultChecked={groupItem.hasTimePlay}
                      onToggle={(hasTimePlay) => {
                        updateProp({
                          uuid: groupItem.uuid,
                          hasTimePlay,
                        });
                        setEnableTimeWorkHour({
                          uuid,
                          hasTimePlay: hasTimePlay,
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
                              <td className="custom-text-3">
                                {member.roomName}
                              </td>
                              <td className="custom-text-3">
                                {member.state.volume}
                              </td>
                              <td className="custom-text-3">
                                {member.state.mute ? "Yes" : "No"}
                              </td>
                              <td className="custom-text-3">
                                {member.state.playbackState}
                              </td>
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
