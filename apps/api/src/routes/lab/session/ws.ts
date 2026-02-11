import ws from "@api/services/ws";

ws.server.on("lab:[id]:init", async ({ params: { id } }) => {
	// NOTE: data should not be available here
	console.log(id);
});
