'use strict';

function playpause(player) {
  var ret = {
    status: 'success',
    paused: false
  };
  if (player.coordinator.state.playbackState === 'PLAYING') {
    ret.paused = true;
    return player.coordinator.pause().then(function (response) {
      return ret;
    });
  }
  return player.coordinator.play().then(function (response) {
    return ret;
  });
}
function play(player) {
  return player.coordinator.play();
}
function pause(player) {
  return player.coordinator.pause();
}
module.exports = function (api) {
  api.registerAction('playpause', playpause);
  api.registerAction('play', play);
  api.registerAction('pause', pause);
};