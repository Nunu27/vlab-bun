import { createRouter } from "@backend/plugins/services";
import { t } from "elysia";

const MessageSchema = t.Object({
	action: t.Union([t.Literal("subscribe"), t.Literal("unsubscribe")]),
	topic: t.Union([t.String(), t.Array(t.String())])
});

export const createTopics = <const Topics extends Record<string, unknown>>(
	topics: Topics
) => ({
	topics,
	use: <const NewTopics extends Record<string, unknown>>(
		newTopics: NewTopics
	) => createTopics<Topics & NewTopics>({ ...topics, ...newTopics })
});

export default <const Topics extends Record<string, unknown>>(
	topics: Topics
) => {
	const topicKeys = Object.keys(topics);
	const topicsEnum = Object.fromEntries(topicKeys.map((name) => [name, name]));
	const topicKeySchema = t.Enum(topicsEnum);

	return createRouter().ws("/ws", {
		body: t.Object({
			action: t.Union([t.Literal("subscribe"), t.Literal("unsubscribe")]),
			topic: t.Union([topicKeySchema, t.Array(topicKeySchema)])
		}),
		message(ws, { action, topic }) {
			const topics = typeof topic === "string" ? [topic] : topic;
			const fn = ws[action].bind(ws);

			for (const topic of topics) {
				fn(topic);
			}
		},
		protected: true
	});
};
