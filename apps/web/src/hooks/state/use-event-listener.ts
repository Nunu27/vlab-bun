import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "usehooks-ts";

interface Options extends AddEventListenerOptions {
	enabled?: boolean;
}

function useEventListener<K extends keyof MediaQueryListEventMap>(
	eventName: K,
	handler: (event: MediaQueryListEventMap[K]) => void,
	element: RefObject<MediaQueryList>,
	options?: boolean | Options,
): void;

function useEventListener<K extends keyof WindowEventMap>(
	eventName: K,
	handler: (event: WindowEventMap[K]) => void,
	element?: undefined,
	options?: boolean | Options,
): void;

function useEventListener<
	K extends keyof HTMLElementEventMap & keyof SVGElementEventMap,
	T extends Element = K extends keyof HTMLElementEventMap
		? HTMLDivElement
		: SVGElement,
>(
	eventName: K,
	handler:
		| ((event: HTMLElementEventMap[K]) => void)
		| ((event: SVGElementEventMap[K]) => void),
	element: RefObject<T>,
	options?: boolean | Options,
): void;

function useEventListener<K extends keyof DocumentEventMap>(
	eventName: K,
	handler: (event: DocumentEventMap[K]) => void,
	element: RefObject<Document>,
	options?: boolean | Options,
): void;

function useEventListener<
	KW extends keyof WindowEventMap,
	KH extends keyof HTMLElementEventMap & keyof SVGElementEventMap,
	KM extends keyof MediaQueryListEventMap,
	T extends HTMLElement | SVGAElement | MediaQueryList = HTMLElement,
>(
	eventName: KW | KH | KM,
	handler: (
		event:
			| WindowEventMap[KW]
			| HTMLElementEventMap[KH]
			| SVGElementEventMap[KH]
			| MediaQueryListEventMap[KM]
			| Event,
	) => void,
	element?: RefObject<T>,
	options?: boolean | Options,
) {
	const savedHandler = useRef(handler);

	useIsomorphicLayoutEffect(() => {
		savedHandler.current = handler;
	}, [handler]);

	useEffect(() => {
		const disabled = typeof options === "object" && options.enabled === false;
		if (disabled || element?.current === null) return;

		const targetElement: T | Window = element?.current ?? window;

		if (!targetElement?.addEventListener) return;

		const listener: typeof handler = (event) => {
			savedHandler.current(event);
		};

		targetElement.addEventListener(eventName, listener, options);

		return () => {
			targetElement.removeEventListener(eventName, listener, options);
		};
	}, [eventName, element, options]);
}

export { useEventListener };
