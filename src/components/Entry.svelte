<script>
  //@ts-check
  import { onMount } from "svelte";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import {
    addMinutes,
    format,
    differenceInMinutes,
    compareAsc,
    isAfter
  } from "date-fns";

  let putDownDate = format(new Date(), "yyyy-MM-dd");
  let putDownTime = format(new Date(), "HH:mm");
  let sleepDate,
    sleepTime,
    wakeDate,
    wakeTime,
    pickUpDate,
    pickUpTime,
    currentDateTime,
    elapsedSleepTime;

  const elapsedSleepTimeDivHeight = tweened(0, {
    duration: 450,
    easing: cubicOut
  });

  let time = new Date();

  onMount(() => {
    const interval = setInterval(() => {
      time = new Date();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  });

  /**
   * @param {string} dateString The string representing the date component in yyyy-MM-dd format
   * @param {string} timeString The string representing the time component in HH:mm format
   * @param {number} minutesToAdd Number of minutes to be added to the starting date generated from dateString and timeString
   * @param {string} outputFormat The output format required, either 'date' or 'time'
   * @returns {string} The new date after adding time, in the required output format. Defaults to 'date' for any other value which is not 'time'
   */
  function addTime(dateString, timeString, minutesToAdd, outputFormat) {
    const newDate = addMinutes(
      new Date(dateString + " " + timeString),
      minutesToAdd
    );
    return outputFormat === "time"
      ? format(newDate, "HH:mm")
      : format(newDate, "yyyy-MM-dd");
  }

  $: sleepDate = addTime(putDownDate, putDownTime, 5, "date");
  $: sleepTime = addTime(putDownDate, putDownTime, 5, "time");
  $: wakeDate = addTime(sleepDate, sleepTime, 90, "date");
  $: wakeTime = addTime(sleepDate, sleepTime, 90, "time");
  $: pickUpDate = addTime(wakeDate, wakeTime, 5, "date");
  $: pickUpTime = addTime(wakeDate, wakeTime, 5, "time");
  $: if (isAfter(time, new Date(sleepDate + " " + sleepTime))) {
    if (isAfter(new Date(wakeDate + " " + wakeTime), time)) {
      elapsedSleepTime = differenceInMinutes(
        time,
        new Date(sleepDate + " " + sleepTime)
      );
    } else {
      elapsedSleepTime = differenceInMinutes(
        new Date(wakeDate + " " + wakeTime),
        new Date(sleepDate + " " + sleepTime)
      );
    }

    elapsedSleepTimeDivHeight.set(6);
  } else {
    elapsedSleepTime = 0;
    elapsedSleepTimeDivHeight.set(0);
  }
</script>

<div class="background p-4">
  <h1>
    Put down at
    <body>
      <input class="input" type="date" bind:value={putDownDate} />
      <input class="input" type="time" bind:value={putDownTime} />
    </body>
  </h1>
  <div class="w-full mt-8 text-3xl text-center">▼</div>
</div>
<div class="background px-4 pt-4 pb-12">
  <h1>
    Fell asleep at
    <body>
      <input
        class="input"
        type="date"
        bind:value={sleepDate}
        min={putDownDate} />
      <input
        class="input"
        type="time"
        bind:value={sleepTime}
        min={putDownTime} />
    </body>
  </h1>
</div>
<div
  class="w-full overflow-hidden bg-accentColor3"
  style="height: {$elapsedSleepTimeDivHeight}rem">
  <body class="text-2xl justify-center items-center flex">
    Asleep for
    <div
      class="inline-block mx-2 px-2 py-1 rounded-full w-auto text-center
      bg-secondaryColor font-bold">
      {elapsedSleepTime}
    </div>
    {elapsedSleepTime === 1 ? 'minute' : 'minutes'}
  </body>
</div>
<div class="background px-4 pb-4 pt-12">
  <h1>
    Woke up at
    <body>
      <input class="input" type="date" bind:value={wakeDate} />
      <input class="input" type="time" bind:value={wakeTime} />
    </body>

  </h1>
  <div class="w-full mt-8 text-3xl text-center">▼</div>
</div>
<div class="background p-4">
  <h1>
    Picked up at
    <body>
      <input class="input" type="date" bind:value={pickUpDate} />
      <input class="input" type="time" bind:value={pickUpTime} />
    </body>
  </h1>
  <div class="flex items-center justify-center">
    <button
      class="py-2 w-1/2 my-12 rounded-lg bg-accentColor2 text-white text-2xl
      font-bold hover:shadow-lg border-b-4 border-teal-700">
      Submit
    </button>
  </div>
</div>
