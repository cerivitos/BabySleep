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

  let innerWidth;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
</script>

<svelte:window bind:innerWidth />

<main class="overflow-hidden">
  {#if innerWidth < 1024}
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
  {:else}
    <div class="w-full h-screen flex flex-row overflow-auto bg-backgroundColor">
      <div class="w-1/3">
        <Entry />
      </div>
      <div class="w-1/3">
        <Summary />
      </div>
      <div class="w-1/3">
        <Settings />
      </div>
    </div>
  {/if}
  <SignIn class="absolute" />
</main>
