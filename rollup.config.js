import commonjs from "rollup-plugin-commonjs";
// import purgeCss from '@fullhuman/postcss-purgecss';
import livereload from "rollup-plugin-livereload";
import postcss from "rollup-plugin-postcss";
import resolve from "rollup-plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import { terser } from "rollup-plugin-terser";
import svelte_preprocess_postcss from "svelte-preprocess-postcss";
import builtins from "rollup-plugin-node-builtins";
import globals from "rollup-plugin-node-globals";
import copy from "rollup-plugin-copy-assets";
import replace from "rollup-plugin-replace";
import dotenv from "dotenv";

dotenv.config();
const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/main.js",
  output: {
    format: "iife",
    sourcemap: true,
    name: "app",
    file: "dist/main.js"
  },

  plugins: [
    //dotenvPlugin(),
    replace({
      include: "credentials.js",
      clientID: JSON.stringify(process.env.CLIENT_ID),
      apiKey: JSON.stringify(process.env.API_KEY),
      scopes: JSON.stringify(process.env.SCOPES),
      discoveryDocs: JSON.stringify(process.env.DISCOVERY_DOCS),
      spreadsheetID: JSON.stringify(process.env.SPREADSHEET_ID),
      sheetName: JSON.stringify(process.env.SHEET_NAME),
      sheetID: JSON.stringify(process.env.SHEET_ID)
    }),
    svelte({
      dev: !production,
      preprocess: {
        style: svelte_preprocess_postcss()
      },
      css: css => {
        css.write("dist/components.css");
      }
    }),
    resolve(),
    commonjs(),
    globals(),
    builtins(),
    copy({
      assets: ["src/assets"]
    }),
    postcss({
      extract: true
    }),
    !production && livereload("dist"),
    production && terser()
  ]
  // watch: {
  //    clearScreen: false,
  // },
};
