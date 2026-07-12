import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		icons({
			compiler: "jsx",
			jsx: "react",
		}),
		tailwindcss(),
	],
	server: {
		port: 5173,
		strictPort: false,
	},
});
