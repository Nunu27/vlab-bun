import { useMemo } from "react";

/** Flip to false to kill the waiting-room joke video entirely. */
export const ENABLE_WAITING_DISTRACTION = true;

const VIDEO_IDS = [
	"QPW3XwBoQlw",
	"LofyMQts7hY",
	"7GbswxYrFT4",
	"KvS0MLj5IIE",
	"8UldPXp8iMw",
];

const CAPTIONS = [
	"While you wait, here's something to watch:",
	"High demand right now, here's a distraction in the meantime:",
	"Nothing to do but wait, so here's something to pass the time:",
	"We're finding you a worker node. Enjoy this while it happens:",
];

function pickRandom<T>(items: T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

interface WaitingDistractionProps {
	/** Whether the high-demand wait is currently happening. */
	active: boolean;
	/** Re-rolls the pick whenever this changes (e.g. dialog open state). */
	sessionKey: unknown;
}

export function WaitingDistraction({
	active,
	sessionKey,
}: WaitingDistractionProps) {
	const videoId = useMemo(() => pickRandom(VIDEO_IDS), [sessionKey]);
	const caption = useMemo(() => pickRandom(CAPTIONS), [sessionKey]);

	if (!ENABLE_WAITING_DISTRACTION || !active) return null;

	return (
		<div className="flex h-full w-32 shrink-0 flex-col items-center bg-slate-950 p-2 sm:w-40">
			<p className="text-center text-[10px] text-slate-400 leading-tight">
				{caption}
			</p>
			<iframe
				className="pointer-events-none aspect-9/16 max-h-full w-full rounded-md"
				src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1`}
				title="waiting distraction"
				allow="autoplay; encrypted-media"
				allowFullScreen
			/>
		</div>
	);
}
