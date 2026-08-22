// Save-timestamp rules, kept in their own module because they are the one part of the save
// endpoint worth testing directly and api/save.js cannot be required without the AWS SDK.
// The CI `test` job has no npm install step, so anything tests/ pulls in has to be
// dependency-free — this file imports nothing.
//
// updatedAt decides which copy of a save wins, both in the staleness check in api/save.js and
// in the client's syncCloudSave. It arrives from the client, so a device whose clock is set
// years ahead used to be able to write a timestamp no honest save could ever beat: every
// later PUT 409'd, and on each load the client saw the remote as newer and pulled that stale
// copy back over the player's real progress. One bad clock pinned the account permanently.

// How far ahead of the server's own clock a client stamp is allowed to be. Wide enough to
// absorb ordinary drift and the flight time of the request, narrow enough that a wrong device
// clock cannot park the save in the future.
const CLOCK_SKEW_MAX = 5 * 60 * 1000;

function isPlausibleStamp(value, now) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= now + CLOCK_SKEW_MAX;
}

// What gets written. A stamp that cannot be true is replaced by server time rather than
// rejected, because the save itself is still good and refusing it would strand a player
// behind a clock they may not know is wrong.
function stampSave(value, now) {
  if (!isPlausibleStamp(value, now)) return now;
  return value;
}

// What the staleness comparison reads. Here an impossible stamp has to score zero, not `now` —
// clamping it up would outrank the timestamp the client just sent and keep rejecting honest
// writes forever, which is the exact failure this is meant to clear. Same treatment a missing
// or non-numeric stamp already got: unusable, so it blocks nothing.
function trustedStamp(value, now) {
  return isPlausibleStamp(value, now) ? value : 0;
}

module.exports = { CLOCK_SKEW_MAX, stampSave, trustedStamp };
