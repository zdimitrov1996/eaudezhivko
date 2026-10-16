export const FEEDBACK_CATEGORIES = ["idea", "bug", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
