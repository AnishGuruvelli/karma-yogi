import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  envDir: "..",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 8081,
    strictPort: false,
  },
});
