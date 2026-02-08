import { type DateArg, formatDistanceToNow } from "date-fns";

export const formatTimeAgo = (date: DateArg<Date>) =>
	formatDistanceToNow(date, { addSuffix: true });
