
import { defineConfig } from "vite";

export default defineConfig({
    build: {
        rolldownOptions: {
            input: { main: "index.html", redirect: "redirect.html" }
        }
    },
    server: {
        host: "localhost",
        port: 5500,
        strictPort: true
    }
});
