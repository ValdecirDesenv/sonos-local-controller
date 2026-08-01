'use strict';

const { getDevices } = require('./deviceService');

const DEBOUNCE_MS = 8000;
const POST_RESTORE_COOLDOWN_MS = 15000;
const SAFETY_NET_INTERVAL_MS = 60000;

// Watches for Sonos group topology drifting from a user-saved "desired"
// configuration (see buildGroupPreset in deviceService.js) and replays it via
// sonos-discovery's own SonosSystem.prototype.applyPreset, but only for
// groups where the user has opted in via autoRestoreGroupEnabled.
function initGroupRestoreWatchdog(discovery, logger) {
  const restoringUuids = new Set();
  let debounceTimer = null;

  function scheduleEvaluation() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      evaluateAll(discovery, logger, restoringUuids);
    }, DEBOUNCE_MS);
  }

  discovery.on('topology-change', scheduleEvaluation);

  // Safety net in case a topology-change event is ever missed.
  setInterval(() => evaluateAll(discovery, logger, restoringUuids), SAFETY_NET_INTERVAL_MS);
}

async function evaluateAll(discovery, logger, restoringUuids) {
  for (const device of Object.values(getDevices())) {
    await evaluateDevice(device, discovery, logger, restoringUuids);
  }
}

async function evaluateDevice(device, discovery, logger, restoringUuids) {
  const { uuid, autoRestoreGroupEnabled, desiredGroupPreset } = device;

  if (!autoRestoreGroupEnabled || !desiredGroupPreset?.players?.length) return;
  if (restoringUuids.has(uuid)) return;

  const zone = discovery.zones?.find((z) => z.uuid === uuid);
  const desiredMemberUuids = new Set(desiredGroupPreset.players.map((p) => p.uuid));
  const currentMemberUuids = new Set(zone ? zone.members.map((m) => m.uuid) : []);

  const isDrifted =
    !zone ||
    currentMemberUuids.size !== desiredMemberUuids.size ||
    [...desiredMemberUuids].some((memberUuid) => !currentMemberUuids.has(memberUuid));

  if (!isDrifted) return;

  const coordinatorInfo = desiredGroupPreset.players[0];
  const coordinatorPlayer = discovery.getPlayerByUUID(coordinatorInfo.uuid);
  if (!coordinatorPlayer) {
    logger.warn(`[groupRestoreWatchdog] Coordinator "${coordinatorInfo.roomName}" is not currently discoverable — skipping restore for this group.`);
    return;
  }

  const availablePlayers = desiredGroupPreset.players.filter((p) => discovery.getPlayerByUUID(p.uuid));
  const missingPlayers = desiredGroupPreset.players.filter((p) => !discovery.getPlayerByUUID(p.uuid));
  if (missingPlayers.length > 0) {
    logger.warn(
      `[groupRestoreWatchdog] ${missingPlayers.map((p) => p.roomName).join(', ')} not currently discoverable — restoring remaining ${availablePlayers.length} player(s) only.`
    );
  }

  restoringUuids.add(uuid);
  logger.info(`[groupRestoreWatchdog] Drift detected for group led by "${coordinatorInfo.roomName}" — restoring desired configuration.`);

  try {
    await discovery.applyPreset({ ...desiredGroupPreset, players: availablePlayers });
    logger.info(`[groupRestoreWatchdog] Restore completed for group led by "${coordinatorInfo.roomName}".`);
  } catch (err) {
    logger.error(`[groupRestoreWatchdog] Restore failed for group led by "${coordinatorInfo.roomName}": ${err.message}`);
  } finally {
    setTimeout(() => restoringUuids.delete(uuid), POST_RESTORE_COOLDOWN_MS);
  }
}

module.exports = { initGroupRestoreWatchdog };
