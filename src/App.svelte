<script>
  import Router from "./components/Router.svelte";
  import SheetTest from "./components/SheetTest.svelte";
  import Entry from "./components/Entry.svelte";
  import SignIn from "./components/SignIn.svelte";
  import Scaffold from "./components/Scaffold.svelte";
  import { onMount } from "svelte";
  import { userName, userPic } from "./store/store.js";
  import { credentials } from "../credentials.js";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
</script>

<main class="overflow-hidden">
  <Scaffold>
    <Entry />
  </Scaffold>
  <SignIn class="absolute" />
</main>
