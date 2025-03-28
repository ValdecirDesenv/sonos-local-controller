'use strict';

function favorite(player, values) {
  return player.coordinator.replaceWithFavorite(decodeURIComponent(values[0])).then(function () {
    return player.coordinator.play();
  });
}
module.exports = function (api) {
  api.registerAction('favorite', favorite);
  api.registerAction('favourite', favorite);
};