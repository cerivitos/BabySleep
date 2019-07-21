<script>
  import Router from "./components/Router.svelte";
  import SheetTest from "./components/SheetTest.svelte";
  import Entry from "./components/Entry.svelte";
  import SignIn from "./components/SignIn.svelte";
  import Settings from "./components/Settings.svelte";
  import Summary from "./components/Summary.svelte";
  import Scaffold from "./components/Scaffold.svelte";
  import { fade } from "svelte/transition";
  import { showEntry, showSettings, showSummary } from "./store/store.js";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
</script>

<main class="overflow-hidden">
  <Scaffold>
    {#if $showEntry}
      <div transition:fade={{ duration: 180 }}>
        <Entry />
      </div>
    {/if}
    {#if $showSettings}
      <div transition:fade={{ duration: 180 }}>
        <Settings />
      </div>
    {/if}
    {#if $showSummary}
      <div transition:fade={{ duration: 180 }}>
        <Summary />
      </div>
    {/if}
  </Scaffold>
  <SignIn class="absolute" />
</main>
