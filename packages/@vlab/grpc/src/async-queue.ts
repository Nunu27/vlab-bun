export class AsyncQueue<T> implements AsyncIterable<T> {
	private queue: T[] = [];
	private resolver: (() => void) | null = null;
	private isClosed = false;

	push(...items: T[]) {
		if (this.isClosed) return;
		this.queue.push(...items);
		if (this.resolver) {
			this.resolver();
			this.resolver = null;
		}
	}

	close() {
		this.isClosed = true;
		if (this.resolver) {
			this.resolver();
			this.resolver = null;
		}
	}

	get length() {
		return this.queue.length;
	}

	async *[Symbol.asyncIterator](): AsyncIterator<T> {
		while (true) {
			if (this.queue.length > 0) {
				yield this.queue.shift() as T;
			} else if (this.isClosed) {
				break;
			} else {
				await new Promise<void>((resolve) => {
					this.resolver = resolve;
				});
			}
		}
	}
}
