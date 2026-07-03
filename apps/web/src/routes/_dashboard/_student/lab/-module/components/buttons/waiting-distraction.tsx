import { useCallback, useEffect, useMemo, useState } from "react";

/** Flip to false to kill the waiting-room joke video entirely. */
export const ENABLE_WAITING_DISTRACTION = true;

const VIDEO_URLS = [
	"https://upload.stashr.wtf/file/documents/file_13707.mp4",
	"https://upload.stashr.wtf/file/documents/file_13709.mp4",
	"https://upload.stashr.wtf/file/documents/file_13710.mp4",
	"https://upload.stashr.wtf/file/documents/file_13711.mp4",
	"https://upload.stashr.wtf/file/documents/file_13713.mp4",
];

const CAPTIONS = [
	"While you wait, here's something to watch:",
	"High demand right now, here's a distraction in the meantime:",
	"Nothing to do but wait, so here's something to pass the time:",
	"We're finding you a worker node. Enjoy this while it happens:",
];

/** Picks a random item, optionally avoiding a repeat of the previous pick. */
function pickRandom<T>(items: T[], exclude?: T): T {
	const pool =
		exclude !== undefined && items.length > 1
			? items.filter((item) => item !== exclude)
			: items;
	return pool[Math.floor(Math.random() * pool.length)];
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
	const [videoUrl, setVideoUrl] = useState(() => pickRandom(VIDEO_URLS));
	const caption = useMemo(() => pickRandom(CAPTIONS), [sessionKey]);

	useEffect(() => {
		setVideoUrl(pickRandom(VIDEO_URLS));
	}, [sessionKey]);

	const playNext = useCallback(() => {
		setVideoUrl((prev) => pickRandom(VIDEO_URLS, prev));
	}, []);

	if (!ENABLE_WAITING_DISTRACTION || !active) return null;

	return (
		<div className="flex h-full w-32 shrink-0 flex-col items-center bg-slate-950 p-2 sm:w-40">
			<p className="text-center text-[10px] text-slate-400 leading-tight">
				{caption}
			</p>
			{/* biome-ignore lint/a11y/useMediaCaption: decorative background clip, no dialogue to transcribe */}
			<video
				key={videoUrl}
				className="pointer-events-none aspect-9/16 max-h-full w-full rounded-md object-cover"
				src={videoUrl}
				autoPlay
				playsInline
				onEnded={playNext}
			/>
		</div>
	);
}
