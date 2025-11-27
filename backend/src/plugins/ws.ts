import { createRouter } from "@backend/plugins/services";
import { t } from "elysia";

export default <Topics extends Record<string, unknown>>(topics: Topics) => {
	const topicKeys = Object.keys(topics) as (keyof Topics & string)[];
	const topicsEnum = Object.fromEntries(topicKeys.map((name) => [name, name]));
	const topicKeySchema = t.Enum(topicsEnum);

	return createRouter().ws("/ws", {
		body: t.Tuple([
			t.Union([t.Literal("subscribe"), t.Literal("unsubscribe")]),
			// t.Union([topicKeySchema, t.Array(topicKeySchema)])
			t.String()
		]),
		message(ws, [action, topic]) {
			const topics = typeof topic === "string" ? [topic] : topic;
			const fn = ws[action].bind(ws);

			for (const topic of topics) {
				fn(topic);
			}
		},
		protected: true
	});
};
