/**
 * Cookie set while an admin is signed in as another user (support mode).
 * Holds the target user's id; the header shows a banner when it matches the
 * signed-in user. Cleared on sign-out.
 */
export const SUPPORT_SESSION_COOKIE = "edf_support_session";
