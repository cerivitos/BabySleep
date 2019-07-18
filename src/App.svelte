<script>
  import Router from "./components/Router.svelte";
  import SheetTest from "./components/SheetTest.svelte";
  import Entry from "./components/Entry.svelte";
  import SignIn from "./components/SignIn.svelte";
  import { onMount } from "svelte";
  import { userName, userPic } from "./store/store.js";
  import { credentials } from "../credentials.js";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
</script>

<main class="overflow-hidden">
  <Entry />
  <SignIn class="absolute" />
</main>
