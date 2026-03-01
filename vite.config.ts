import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";
import manifestBase from "./manifest.json";
import pkg from "./package.json";

// Build the final manifest, injecting the version from package.json so that
// bumping `version` in package.json is the only change needed on a release.
const manifest = { ...manifestBase, version: pkg.version };

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        crx({ manifest }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    define: {
        // Make the version available inside the React app as __APP_VERSION__.
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
        rollupOptions: {
            // Include the dashboard HTML so CRXJS bundles it into dist/
            input: {
                dashboard: "index.html",
            },
        },
    },
    // Ensure the dev server works well with the extension
    server: {
        port: 5173,
        strictPort: true,
        hmr: {
            port: 5173,
        },
    },
});
