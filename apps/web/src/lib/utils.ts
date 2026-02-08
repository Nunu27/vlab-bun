import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getFirst<T>(iter: Iterable<T>) {
	const iterator = iter[Symbol.iterator]();
	const result = iterator.next();
	return result.done ? undefined : result.value;
}

export function getRandom<T>(arr: T[]) {
	return arr[Math.floor(Math.random() * arr.length)];
}

export function removeFromArray<T>(arr: T[], index: number) {
	const last = arr.at(-1);
	if (index < 0 || !last) return;

	arr[index] = last;
	arr.pop();
}

export function removeItemFromArray<T>(arr: T[], item: T) {
	const index = arr.indexOf(item);
	removeFromArray(arr, index);
}

export enum MouseButton {
	Left = 0,
	Wheel = 1,
	Right = 2,
	Back = 3,
	Forward = 4,
}

export function mouseButtonPressed(
	state: number,
	buttons: MouseButton | MouseButton[],
): boolean {
	if (Array.isArray(buttons)) {
		return buttons.some((b) => mouseButtonPressed(state, b));
	}

	const button = 2 ** buttons;
	return Boolean(state & (1 << button));
}
