import "./main.pcss";
import App from "./App.svelte";
import dotenv from "dotenv";

dotenv.config();

new App({
  target: document.body
});
