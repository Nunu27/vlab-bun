import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	plugins: [
		devtools(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackRouter({ target: "react", autoCodeSplitting: true }),
		viteReact(),
	],
	build: {
		outDir: "../../out/manager/public",
		emptyOutDir: true,
	},
	server: {
		proxy: {
			"/ws": { target: "http://localhost:3000", ws: true },
			"/display": { target: "http://localhost:8080", ws: true },
			"/api": "http://localhost:3000",
		},
	},
});

export default config;
