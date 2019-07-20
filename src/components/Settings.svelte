<script>
  import { userName, userPic } from "../store/store.js";
  import { onMount } from "svelte";

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
    @apply w-8 lowercase border-b-4 text-secondaryColor bg-transparent mb-4 text-center;
  }
</style>

<div class="w-full bg-backgroundColor p-4">
  <div class="mt-2 flex-col">
    <h2>Signed in as</h2>
    <div class="flex items-center">
      <img
        src={$userPic}
        alt="User profile picture"
        class="rounded-full w-8 h-8 mr-2 flex-none" />
      <body class="flex-1 font-bold">{$userName}</body>
      <button class="button">SIGN OUT</button>
    </div>
  </div>
  <div class="mt-8 flex-col">
    <h2>Connected to</h2>
    <div class="flex items-center">
      <body class="flex-1 font-bold">Hongjun's sleep log</body>
      <button class="button">OPEN</button>
    </div>
  </div>
  <div class="mt-8 flex-col">
    <h2>Intervals</h2>
    <div class="flex">
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
    <div class="flex">
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
    <div class="flex pb-8">
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
