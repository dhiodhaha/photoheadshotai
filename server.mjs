import { serve } from "@hono/node-server";

const port = Number(process.env.PORT) || 3000;

const { default: server } = await import("./dist/server/server.js");

serve(
	{
		fetch: server.fetch,
		port,
	},
	(info) => {
		console.log(`Server running on http://0.0.0.0:${info.port}`);
	},
);
