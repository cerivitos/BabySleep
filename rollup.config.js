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

console.log(process.env.CLIENT_ID);

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
      clientID: JSON.stringify(process.env.client_id),
      apiKey: JSON.stringify(process.env.api_key),
      scopes: JSON.stringify(process.env.scopes),
      discoveryDocs: JSON.stringify(process.env.discovery_docs),
      spreadsheetID: JSON.stringify(process.env.spreadsheet_id),
      sheetName: JSON.stringify(process.env.sheet_name),
      sheetID: JSON.stringify(process.env.sheet_id)
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
