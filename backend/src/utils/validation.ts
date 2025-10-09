import { FormatRegistry } from "@sinclair/typebox";

FormatRegistry.Set("uri", (value) =>
	/^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i.test(value)
);
