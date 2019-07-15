<script>
  import { onMount } from "svelte";

  Date.prototype.toDateInputValue = function() {
    let local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());

    return local.toJSON().slice(0, 10);
  };

  Date.prototype.toTimeInputValue = function() {
    let local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());

    return local.toJSON().slice(11, 16);
  };

  let putDownDate = new Date().toDateInputValue();
  let putDownTime = new Date().toTimeInputValue();
  let sleepDate,
    sleepTime,
    wakeDate,
    wakeTime,
    pickUpDate,
    pickUpTime,
    currentDateTime,
    elapsedSleepTime;

  let time = new Date();

  onMount(() => {
    const interval = setInterval(() => {
      time = new Date();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  });

  $: currentDateTime = time.getTime();
  $: if (sleepTime === undefined) {
    elapsedSleepTime = 0;
  } else {
    let sleepDateMillis = new Date(sleepDate + " " + sleepTime).getTime();

    elapsedSleepTime = Math.round(
      (currentDateTime - sleepDateMillis) / 1000 / 60
    );
  }
</script>

<style>
  .input {
    @apply text-3xl border-b-4 text-secondaryColor border-accentColor bg-transparent mb-4 w-auto;
  }

  .background {
    @apply p-4 bg-backgroundColor text-primaryColor;
  }
</style>

<div class="background">
  <h1>
    Put down at
    <input class="input" type="date" bind:value={putDownDate} />
    <input class="input" type="time" bind:value={putDownTime} />
  </h1>
  <div class="w-full my-8 text-3xl text-center">▼</div>
</div>
<div class="background">
  <h1>
    Fell asleep at
    <input
      class="input"
      type="date"
      bind:value={sleepDate}
      value={new Date().toDateInputValue()}
      min={putDownDate} />
    <input
      class="input"
      type="time"
      bind:value={sleepTime}
      value={new Date().toTimeInputValue()}
      min={putDownTime} />
  </h1>
  <div class="w-full my-8 text-3xl text-center">▼</div>
</div>
<div class="my-12 w-full justify-center flex">
  <body class="text-2xl text-backgroundColor">
    Asleep for
    <div
      class="inline-block px-2 py-1 rounded-full w-auto text-center
      bg-secondaryColor font-medium">
      {elapsedSleepTime}
    </div>
    {elapsedSleepTime === 1 ? 'minute' : 'minutes'}
  </body>
</div>

<div class="w-full my-8 text-3xl text-center">▼</div>
<h1>
  Woke up at
  <input class="input" type="date" bind:value={wakeDate} />
  <input class="input" type="time" bind:value={wakeTime} />
</h1>
<div class="w-full my-8 text-3xl text-center">▼</div>
<h1>
  Picked up at
  <input class="input" type="date" bind:value={pickUpDate} />
  <input class="input" type="time" bind:value={pickUpTime} />
</h1>
