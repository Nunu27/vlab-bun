import { describe, expect, test } from "bun:test";
import {
	applyRosListEvent,
	deterministicStringify,
	removeItemFromArray,
	removeItemFromArrayByIndex,
	throttle,
	withRetry,
} from "./utils";

describe("deterministicStringify", () => {
	test("key order does not affect the result", () => {
		expect(deterministicStringify({ a: 1, b: 2 })).toBe(
			deterministicStringify({ b: 2, a: 1 }),
		);
	});

	test("serializes nested objects and arrays with sorted keys", () => {
		expect(deterministicStringify({ b: [3, 2, 1], a: { z: 1, y: 2 } })).toBe(
			'{"a":{"y":2,"z":1},"b":[3,2,1]}',
		);
	});

	test("handles null, undefined, and primitives", () => {
		expect(deterministicStringify(null)).toBe("null");
		expect(deterministicStringify(undefined)).toBe("undefined");
		expect(deterministicStringify("x")).toBe('"x"');
		expect(deterministicStringify(42)).toBe("42");
	});
});

describe("removeItemFromArrayByIndex", () => {
	test("swaps the last element into the removed slot (order not preserved)", () => {
		const arr = [1, 2, 3, 4];
		removeItemFromArrayByIndex(arr, 1);
		expect(arr).toEqual([1, 4, 3]);
	});

	test("is a no-op for an out-of-range index", () => {
		const arr = [1, 2, 3];
		removeItemFromArrayByIndex(arr, 5);
		removeItemFromArrayByIndex(arr, -1);
		expect(arr).toEqual([1, 2, 3]);
	});

	test("refuses to remove when the last element is falsy (0/''/false)", () => {
		// Documents a real quirk: the `!lastItem` guard treats a falsy last
		// element the same as an empty array, so removal silently no-ops.
		const arr = [1, 2, 0];
		removeItemFromArrayByIndex(arr, 0);
		expect(arr).toEqual([1, 2, 0]);
	});
});

describe("removeItemFromArray", () => {
	test("removes the first matching value", () => {
		const arr = ["a", "b", "c"];
		removeItemFromArray(arr, "b");
		expect(arr).toEqual(["a", "c"]);
	});

	test("is a no-op when the value is not present", () => {
		const arr = ["a", "b"];
		removeItemFromArray(arr, "z");
		expect(arr).toEqual(["a", "b"]);
	});
});

describe("applyRosListEvent", () => {
	type Item = { id: string; value: number };
	const keyOf = (item: Item) => item.id;

	test("adds a new item that isn't marked dead", () => {
		const list: Item[] = [];
		applyRosListEvent(list, { id: "1", value: 10 }, keyOf);
		expect(list).toEqual([{ id: "1", value: 10 }]);
	});

	test("updates an existing item in place", () => {
		const list: Item[] = [{ id: "1", value: 10 }];
		applyRosListEvent(list, { id: "1", value: 99 }, keyOf);
		expect(list).toEqual([{ id: "1", value: 99 }]);
	});

	test("removes an item flagged as dead", () => {
		const list: Item[] = [
			{ id: "1", value: 10 },
			{ id: "2", value: 20 },
		];
		applyRosListEvent(list, { id: "1", value: -1, ".dead": "true" }, keyOf);
		expect(list).toEqual([{ id: "2", value: 20 }]);
	});

	test("ignores a dead event for an id it doesn't know about", () => {
		const list: Item[] = [{ id: "1", value: 10 }];
		applyRosListEvent(list, { id: "99", value: -1, ".dead": "true" }, keyOf);
		expect(list).toEqual([{ id: "1", value: 10 }]);
	});
});

describe("throttle", () => {
	test("fires immediately on the first call, then once more for trailing calls", async () => {
		const calls: number[] = [];
		const fn = async (n: number) => {
			calls.push(n);
			return n;
		};
		const throttled = throttle(fn, 20);

		const r1 = await throttled(1);
		expect(r1).toBe(1);
		expect(calls).toEqual([1]);

		// Both calls land inside the same throttle window; only the
		// latest-queued args should produce a second, trailing call.
		const p2 = throttled(2);
		const p3 = throttled(3);
		const [r2, r3] = await Promise.all([p2, p3]);

		expect(calls).toEqual([1, 3]);
		expect(r2).toBe(3);
		expect(r3).toBe(3);
	});
});

describe("withRetry", () => {
	test("returns the result on the first successful attempt", async () => {
		let calls = 0;
		const result = await withRetry(async () => {
			calls++;
			return "ok";
		});
		expect(result).toBe("ok");
		expect(calls).toBe(1);
	});

	test("retries after transient failures and eventually succeeds", async () => {
		let calls = 0;
		const result = await withRetry(
			async () => {
				calls++;
				if (calls < 3) throw new Error("transient");
				return "ok";
			},
			{ minDelayMs: 1, maxDelayMs: 2 },
		);
		expect(result).toBe("ok");
		expect(calls).toBe(3);
	});

	test("throws after exhausting all retries", async () => {
		let calls = 0;
		await expect(
			withRetry(
				async () => {
					calls++;
					throw new Error("always fails");
				},
				{ retries: 3, minDelayMs: 1, maxDelayMs: 2 },
			),
		).rejects.toThrow("always fails");
		expect(calls).toBe(3);
	});

	test("rejects immediately when the signal is already aborted", async () => {
		const controller = new AbortController();
		controller.abort();
		let calls = 0;

		await expect(
			withRetry(
				async () => {
					calls++;
					return "ok";
				},
				{ signal: controller.signal },
			),
		).rejects.toThrow("Aborted");
		expect(calls).toBe(0);
	});

	test("aborts mid-backoff without waiting out the full delay", async () => {
		const controller = new AbortController();
		let calls = 0;
		const promise = withRetry(
			async () => {
				calls++;
				throw new Error("fail");
			},
			{ minDelayMs: 200, maxDelayMs: 200, signal: controller.signal },
		);

		setTimeout(() => controller.abort(), 10);

		await expect(promise).rejects.toThrow("Aborted");
		expect(calls).toBe(1);
	});
});
