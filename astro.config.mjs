import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Site will be served from GitHub Pages as a project site (separate
// from your existing kcatubigdesign.github.io user site). GitHub Pages
// serves project sites at https://<user>.github.io/<repo-name>/ — update
// `base` below if you name the GitHub repo something other than
// "comparison-app".
export default defineConfig({
  site: "https://kcatubigdesign.github.io",
  base: "/comparison-app",
  vite: {
    plugins: [tailwindcss()],
  },
});
