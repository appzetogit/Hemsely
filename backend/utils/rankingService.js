import { isUserOnline } from '../socket/index.js';

// Weights per the product spec: tier=30%, online status=20%, time-spent=50%.
const WEIGHTS = { tier: 0.3, online: 0.2, timeSpent: 0.5 };

// Priority: Active Boosted User (1.5) > Super User (1.0) > Premium+Verified (0.75) > Verified (0.5) > Premium (0.25).
const tierScore = (user) => {
  if (user.boostUntil && new Date(user.boostUntil) > new Date()) return 1.5;
  if (user.isBoosted && user.boostUntil && new Date(user.boostUntil) > new Date()) return 1.5;
  if (user.isSuperUser) return 1;
  if (user.isPremium && user.isVerified) return 0.75;
  if (user.isVerified) return 0.5;
  if (user.isPremium) return 0.25;
  return 0;
};

// Average session length is normalized against a fixed cap rather than the
// candidate pool's own max, so scores stay stable/comparable across requests.
const AVERAGE_SESSION_CAP_MINUTES = 30;

const timeSpentScore = (user) => {
  if (!user.sessionCount) return 0;
  const avgMinutes = user.totalActiveMinutes / user.sessionCount;
  return Math.min(avgMinutes / AVERAGE_SESSION_CAP_MINUTES, 1);
};

export const rankProfiles = (users) => {
  return users
    .map((user) => {
      const score =
        WEIGHTS.tier * tierScore(user) +
        WEIGHTS.online * (isUserOnline(user._id) ? 1 : 0) +
        WEIGHTS.timeSpent * timeSpentScore(user);
      return { user, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ user }) => user);
};
