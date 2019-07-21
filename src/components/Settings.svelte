<script>
  import { userName, userPic } from "../store/store.js";
  import { onMount } from "svelte";
  import { signOut, signIn } from "../util.js";
  import { fade } from "svelte/transition";
  import { credentials } from "../../credentials.js";

  let Nap1ToNap2Hr,
    Nap1ToNap2Min,
    Nap2ToNap3Hr,
    Nap2ToNap3Min,
    Nap3ToSleepHr,
    Nap3ToSleepMin;

  onMount(() => {
    const intervals = [
      "Nap1ToNap2Hr",
      "Nap1ToNap2Min",
      "Nap2ToNap3Hr",
      "Nap2ToNap3Min",
      "Nap3ToSleepHr",
      "Nap3ToSleepMin"
    ];

    for (let i = 0; i < intervals.length; i++) {
      const stored = localStorage.getItem(intervals[i]);

      if (stored !== undefined) {
        if (intervals[i] === "Nap1ToNap2Hr") {
          Nap1ToNap2Hr = stored;
        } else if (intervals[i] === "Nap1ToNap2Min") {
          Nap1ToNap2Min = stored;
        } else if (intervals[i] === "Nap2ToNap3Hr") {
          Nap2ToNap3Hr = stored;
        } else if (intervals[i] === "Nap2ToNap3Min") {
          Nap2ToNap3Min = stored;
        } else if (intervals[i] === "Nap3ToSleepHr") {
          Nap3ToSleepHr = stored;
        } else if (intervals[i] === "Nap3ToSleepMin") {
          Nap3ToSleepMin = stored;
        }
      } else {
        if (intervals[i] === "Nap1ToNap2Hr") {
          intervals[i] = "2";
        } else if (intervals[i] === "Nap1ToNap2Min") {
          intervals[i] = "0";
        } else if (intervals[i] === "Nap2ToNap3Hr") {
          intervals[i] = "1";
        } else if (intervals[i] === "Nap2ToNap3Min") {
          intervals[i] = "50";
        } else if (intervals[i] === "Nap3ToSleepHr") {
          intervals[i] = "1";
        } else if (intervals[i] === "Nap3ToSleepMin") {
          intervals[i] = "30";
        }
      }
    }
  });

  function openSheet() {
    window.open(
      `https://docs.google.com/spreadsheets/d/${credentials.SHEET_ID}`,
      "_blank"
    );
  }

  $: if (Nap1ToNap2Hr < 0) {
    Nap1ToNap2Hr = 0;
  } else if (Nap1ToNap2Hr > 3) {
    Nap1ToNap2Hr = 3;
  } else if (Nap1ToNap2Hr !== undefined) {
    localStorage.setItem("Nap1ToNap2Hr", Nap1ToNap2Hr);
  }

  $: if (Nap2ToNap3Hr < 0) {
    Nap2ToNap3Hr = 0;
  } else if (Nap2ToNap3Hr > 3) {
    Nap2ToNap3Hr = 3;
  } else if (Nap2ToNap3Hr !== undefined) {
    localStorage.setItem("Nap2ToNap3Hr", Nap2ToNap3Hr);
  }

  $: if (Nap3ToSleepHr < 0) {
    Nap3ToSleepHr = 0;
  } else if (Nap3ToSleepHr > 3) {
    Nap3ToSleepHr = 3;
  } else if (Nap3ToSleepHr !== undefined) {
    localStorage.setItem("Nap3ToSleepHr", Nap3ToSleepHr);
  }

  $: if (Nap1ToNap2Min < 0) {
    Nap1ToNap2Min = 0;
  } else if (Nap1ToNap2Min > 59) {
    Nap1ToNap2Min = 59;
  } else if (Nap1ToNap2Min !== undefined) {
    localStorage.setItem("Nap1ToNap2Min", Nap1ToNap2Min);
  }

  $: if (Nap2ToNap3Min < 0) {
    Nap2ToNap3Min = 0;
  } else if (Nap2ToNap3Min > 59) {
    Nap2ToNap3Min = 59;
  } else if (Nap2ToNap3Min !== undefined) {
    localStorage.setItem("Nap2ToNap3Min", Nap2ToNap3Min);
  }

  $: if (Nap3ToSleepMin < 0) {
    Nap3ToSleepMin = 0;
  } else if (Nap3ToSleepMin > 59) {
    Nap3ToSleepMin = 59;
  } else if (Nap3ToSleepMin !== undefined) {
    localStorage.setItem("Nap3ToSleepMin", Nap3ToSleepMin);
  }
</script>

<style type="text/postcss">
  body {
    @apply text-secondaryColor;
  }

  h2 {
    @apply text-primaryColor;
  }

  .button {
    @apply text-primaryColor flex-none font-bold p-2 rounded fill-current;
  }

  .input {
    @apply w-8 lowercase border-b-4 text-secondaryColor bg-transparent text-center w-auto;
  }
</style>

<div class="w-full bg-backgroundColor p-4">
  {#if $userName !== undefined && $userPic !== undefined}
    <div class="mt-2 flex-col" in:fade={{ duration: 400 }}>
      <h2>Signed in as</h2>
      <div class="flex items-center">
        <img
          src={$userPic}
          alt="User profile picture"
          class="rounded-full w-8 h-8 mr-2 flex-none" />
        <body class="flex-1 font-bold">{$userName}</body>
        <button class="button" on:click={() => signOut()}>SIGN OUT</button>
      </div>
    </div>
  {:else}
    <div class="mt-2 flex-col" in:fade={{ duration: 400 }}>
      <h2>Sign in required</h2>
      <div class="flex justify-center">
        <button
          class="flex bg-white rounded shadow text-gray-700 font-bold py-2 px-4"
          on:click={() => signIn()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 48 48"
            class="w-6 h-6 pr-2">
            <defs>
              <path
                id="a"
                d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2
                0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6
                4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22
                0-1.3-.2-2.7-.5-4z" />
            </defs>
            <clipPath id="b">
              <use xlink:href="#a" overflow="visible" />
            </clipPath>
            <path clip-path="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z" />
            <path
              clip-path="url(#b)"
              fill="#EA4335"
              d="M0 11l17 13 7-6.1L48 14V0H0z" />
            <path
              clip-path="url(#b)"
              fill="#34A853"
              d="M0 37l30-23 7.9 1L48 0v48H0z" />
            <path
              clip-path="url(#b)"
              fill="#4285F4"
              d="M48 48L17 24l-4-3 35-10z" />
          </svg>
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  {/if}
  <div class="mt-8 flex-col">
    <h2>Connected to</h2>
    <div class="flex items-center">
      <body class="flex-1 font-bold">Hongjun's Sleep Log</body>
      <button class="button" on:click={() => openSheet()}>OPEN</button>
    </div>
  </div>
  <div class="mt-8 flex-col">
    <h2>Intervals</h2>
    <div class="flex items-center my-4">
      <body class="w-3/4 font-bold">Nap 1 to Nap 2</body>
      <input
        type="number"
        bind:value={Nap1ToNap2Hr}
        max="3"
        min="0"
        class="input" />
      <body class="ml-1 mr-2">hr</body>
      <input
        type="number"
        bind:value={Nap1ToNap2Min}
        max="59"
        min="0"
        class="input" />
      <body class="ml-1">min</body>
    </div>
    <div class="flex items-center mb-4">
      <body class="w-3/4 font-bold">Nap 2 to Nap 3</body>
      <input
        type="number"
        bind:value={Nap2ToNap3Hr}
        max="3"
        min="0"
        class="input" />
      <body class="ml-1 mr-2">hr</body>
      <input
        type="number"
        bind:value={Nap2ToNap3Min}
        max="59"
        min="0"
        class="input" />
      <body class="ml-1">min</body>
    </div>
    <div class="flex pb-8 items-center mb-4">
      <body class="w-3/4 font-bold">Nap 3 to Sleep</body>
      <input
        type="number"
        bind:value={Nap3ToSleepHr}
        max="3"
        min="0"
        class="input"
        id="Nap3ToSleepHr" />
      <body class="ml-1 mr-2">hr</body>
      <input
        type="number"
        bind:value={Nap3ToSleepMin}
        max="59"
        min="0"
        class="input" />
      <body class="ml-1">min</body>
    </div>
  </div>
</div>
