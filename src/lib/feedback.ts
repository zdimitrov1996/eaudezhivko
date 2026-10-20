export const FEEDBACK_CATEGORIES = ["idea", "bug", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

/** in_progress and done notify a signed-in author (see `admin_set_feedback_status`) */
export type FeedbackStatus = "new" | "in_progress" | "done";
