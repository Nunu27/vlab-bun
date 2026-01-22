import { formatDistanceToNow, type DateArg } from 'date-fns';

export const formatTimeAgo = (date: DateArg<Date>) =>
  formatDistanceToNow(date, { addSuffix: true });
