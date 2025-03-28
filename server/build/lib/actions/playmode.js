'use strict';

function repeat(player, values) {
  var mode = values[0];
  if (mode === "on") {
    mode = "all";
  } else if (mode === "off") {
    mode = "none";
  } else if (mode === "toggle") {
    switch (player.coordinator.state.playMode.repeat) {
      case 'all':
        mode = "one";
        break;
      case 'one':
        mode = "off";
        break;
      default:
        mode = "all";
    }
  }
  return player.coordinator.repeat(mode).then(function (response) {
    return {
      status: 'success',
      repeat: mode
    };
  });
}
function shuffle(player, values) {
  var enable = values[0] === "on";
  if (values[0] == "toggle") enable = !player.coordinator.state.playMode.shuffle;
  return player.coordinator.shuffle(enable).then(function (response) {
    return {
      status: 'success',
      shuffle: enable
    };
  });
}
function crossfade(player, values) {
  var enable = values[0] === "on";
  if (values[0] == "toggle") enable = !player.coordinator.state.playMode.crossfade;
  return player.coordinator.crossfade(enable).then(function (response) {
    return {
      status: 'success',
      crossfade: enable
    };
  });
}
module.exports = function (api) {
  api.registerAction('repeat', repeat);
  api.registerAction('shuffle', shuffle);
  api.registerAction('crossfade', crossfade);
};