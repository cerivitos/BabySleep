<script>
  import { onMount, onDestroy } from "svelte";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { fade } from "svelte/transition";
  import {
    addMinutes,
    format,
    differenceInMinutes,
    compareAsc,
    isAfter,
    isDate,
    isEqual
  } from "date-fns";
  import { gapiInstance, userName } from "../store/store.js";
  import { credentials } from "../../credentials.js";
  import EntryBlock from "./EntryBlock.svelte";
  import { signIn } from "../util.js";
  import LoadingSpinner from "./LoadingSpinner.svelte";

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

  let innerWidth;

  /**
   * Validation checks to verify if the inputted date time is after the date time of he previous field
   * @type {boolean}
   */
  let check2v1 = true;
  let check3v2 = true;
  let check4v3 = true;

  let isNap = true;
  let nextPutDownTime;

  let sending = false;

  const elapsedSleepTimeDivHeight = tweened(0, {
    duration: 450,
    easing: cubicOut
  });

  const nextPutDownTimeDivHeight = tweened(0, {
    duration: 450,
    easing: cubicOut
  });

  let time = new Date();

  onMount(() => {
    if (window.location.search.length > 0) {
      let incomingParams = {};

      const params = window.location.search.substr(1);
      params.split("&").forEach(param => {
        const key = param.split("=")[0];
        const value = param.split("=")[1];

        if (key !== "page") {
          incomingParams[key] = value;
        }
      });

      console.log(incomingParams);

      if (Object.keys(incomingParams).length > 0) {
        localStorage.setItem("cache", JSON.stringify(incomingParams));

        readFromCache();
      }
    } else
    if (localStorage.getItem("cache") != undefined) {
      readFromCache();
    }

    const interval = setInterval(() => {
      time = new Date();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  });

  onDestroy(() => {
    saveToCache();
  });

  /**
   * Save form entries to localStorage with each update to prevent data loss
   */
  function saveToCache() {
    let cache = {
      putDownDate: putDownDate,
      putDownTime: putDownTime,
      sleepDate: sleepDate,
      sleepTime: sleepTime,
      wakeDate: wakeDate,
      wakeTime: wakeTime,
      pickUpDate: pickUpDate,
      pickUpTime: pickUpTime,
      isNap: isNap
    };

    localStorage.setItem("cache", JSON.stringify(cache));
  }

  /**
   * Read saved form entries from either url params or localStorage and assign to variables
  */
 function readFromCache() {
   const cache = JSON.parse(localStorage.getItem("cache"));

      putDownDate = cache.putDownDate;
      putDownTime = cache.putDownTime;
      sleepDate = cache.sleepDate;
      sleepTime = cache.sleepTime;
      pickUpDate = cache.pickUpDate;
      pickUpTime = cache.pickUpTime;
      wakeDate = cache.wakeDate;
      wakeTime = cache.wakeTime;
      cache.isNap !== undefined ? (isNap = cache.isNap) : (isNap = true);
 }

  /**
   * @param {string} dateString The string representing the date component in yyyy-MM-dd format
   * @param {string} timeString The string representing the time component in HH:mm format
   * @param {number} minutesToAdd Number of minutes to be added to the starting date generated from dateString and timeString
   * @param {string} outputFormat The output format required, either 'date' or 'time'
   * @returns {string} The new date after adding time, in the required output format. Defaults to 'date' for any other value which is not 'time'
   */
  function addTime(dateString, timeString, minutesToAdd, outputFormat) {
    const newDate = addMinutes(
      new Date(dateString + "T" + timeString),
      minutesToAdd
    );
    return outputFormat === "time"
      ? format(newDate, "HH:mm")
      : format(newDate, "yyyy-MM-dd");
  }

  /**
   * Ensures all validation criteria are met before sending to Sheets API
   */
  function validateAndSend() {
    let currentRow;

    if (
      check2v1 &&
      check3v2 &&
      check4v3 &&
      $gapiInstance.client.sheets !== null
    ) {
      /**
       * Set sending flag to true and show loading spinner
       */
      sending = true;

      /**
       * Saves the nap number for use later when calculating estimated next put down time.
       * @type {number}
       */
      let napNumber;

      /**
       * Get the row number after adding this current data. Needed for formulas.
       */
      $gapiInstance.client.sheets.spreadsheets.values
        .get({
          spreadsheetId: credentials.SPREADSHEET_ID,
          range: credentials.SHEET_NAME + "!A1:A"
        })
        .then(response => {
          currentRow = response.result.values.length + 1;

          /**
           * Add data by appending after the last current row of data. Includes formulas to calculate other columns.
           */
          $gapiInstance.client.sheets.spreadsheets.values
            .append({
              spreadsheetId: credentials.SPREADSHEET_ID,
              range: credentials.SHEET_NAME,
              valueInputOption: "USER_ENTERED",
              includeValuesInResponse: true,
              resource: {
                values: [
                  [
                    /**
                     * Put Down (PD)
                     * */
                    putDownDate + " " + putDownTime,
                    /**
                     * Sleep Start
                     * */
                    sleepDate + " " + sleepTime,
                    /**
                     * Sleep End
                     */
                    wakeDate + " " + wakeTime,
                    /**
                     * Pick Up
                     */
                    pickUpDate + " " + pickUpTime,
                    /**
                     * Next Put Down
                     */
                    `=C${currentRow}+(D${currentRow}-C${currentRow})/2+if(M${currentRow}=1,Rules!$B$7,if(M${currentRow}=2,Rules!$B$8,Rules!$B$9))`,
                    /**
                     * Time to fall asleep
                     */
                    `=if(or(A${currentRow}="",B${currentRow}=""),"",B${currentRow}-A${currentRow})`,
                    /**
                     * Sleep Duration
                     */
                    `=if(or(C${currentRow}="",B${currentRow}=""),"",C${currentRow}-B${currentRow})`,
                    /**
                     * WT to PD
                     */
                    `=A${currentRow}-C${currentRow - 1}`,
                    /**
                     * Adjusted WT
                     */
                    `=(A${currentRow}-D${currentRow -
                      1})+(F${currentRow}/2)+(D${currentRow - 1}-C${currentRow -
                      1})/2`,
                    /**
                     * Actual WT
                     */
                    `=B${currentRow}-C${currentRow - 1}`,
                    /**
                     * Total WT (TWT)
                     */
                    `=if(and(day(B${currentRow})=day(B${currentRow -
                      1}),month(B${currentRow})=month(B${currentRow -
                      1})),I${currentRow}+K${currentRow - 1},I${currentRow})`,
                    /**
                     * Type
                     */
                    isNap ? "Nap" : "Sleep",
                    /**
                     * Count
                     */
                    `=if(and(day(B${currentRow})=DAY(B${currentRow -
                      1}),month(B${currentRow})=month(B${currentRow -
                      1}),L${currentRow}=L${currentRow - 1}),M${currentRow -
                      1}+1,1)`,
                    /**
                     * Total Sleep
                     */
                    `=if(and(day(B${currentRow})=day(B${currentRow -
                      1}),month(B${currentRow})=month(B${currentRow -
                      1})),G${currentRow}+N${currentRow - 1},G${currentRow})`,
                    /**
                     * Date
                     */
                    `=if(hour(A${currentRow}) < Rules!$B$5, date(year(A${currentRow}), month(A${currentRow}), day(A${currentRow})) - 1, date(year(A${currentRow}), month(A${currentRow}), day(A${currentRow})))`,
                    /**
                     * Duration
                     */
                    `=G${currentRow}`
                  ]
                ]
              }
            })
            .then(response => {
              if (response.status == 200) {
                /**
                 * Save the nap number to calculate estimated next put down time. The nap number is taken from the sheet as it is calculated by the formula appended above.
                 */
                napNumber = parseInt(
                  response.result.updates.updatedData.values[0][12]
                );

                nextPutDownTime = format(
                  Date.parse(response.result.updates.updatedData.values[0][4]),
                  "h:mm a"
                );

                /**
                 * Update cell format to date time for the first five columns.
                 */
                $gapiInstance.client.sheets.spreadsheets
                  .batchUpdate({
                    spreadsheetId: credentials.SPREADSHEET_ID,
                    requests: [
                      {
                        repeatCell: {
                          range: {
                            sheetId: credentials.SHEET_ID,
                            startRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 5
                          },
                          cell: {
                            userEnteredFormat: {
                              numberFormat: {
                                type: "DATE",
                                pattern: "d mmm, h:mm am/pm"
                              }
                            }
                          },
                          fields: "userEnteredFormat.numberFormat"
                        }
                      }
                    ]
                  })
                  .then(response => {
                    /**
                     * Hide loading spinner
                     */
                    sending = false;

                    putDownTime = format(new Date(), "HH:mm");
                    sleepTime = undefined;
                    wakeTime = undefined;
                    pickUpTime = undefined;
                    check2v1 = false;
                    check3v2 = false;
                    check4v3 = false;
                    isNap = true;

                    localStorage.setItem("cache", "");

                    document
                      .getElementById("topBlock")
                      .scrollIntoView({ behavior: "smooth" });
                  });
              }
            });
        });
    } else {
      console.log(
        `Failed to send:\nCheck 2 v 1: ${check2v1}\nCheck 3 v 2: ${check3v2}\nCheck 4 v 3: ${check4v3}\ngapi: ${gapiInstance}`
      );
      /**
       * Hide loading spinner
       */
      sending = false;
    }
  }

  function receivePutDown(event) {
    putDownDate = event.detail.date;
    putDownTime = event.detail.time;
    saveToCache();
  }

  function receiveFellAsleep(event) {
    sleepDate = event.detail.date;
    sleepTime = event.detail.time;
    saveToCache();
  }

  function receiveWokeUp(event) {
    wakeDate = event.detail.date;
    wakeTime = event.detail.time;
    saveToCache();
  }

  function receivePickedUp(event) {
    pickUpDate = event.detail.date;
    pickUpTime = event.detail.time;
    saveToCache();
  }

  function shareParams() {
    let url = document.location.href;

    if (localStorage.getItem("cache") !== undefined) {
      const cache = JSON.parse(localStorage.getItem("cache"));

      const keys = Object.keys(cache);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = cache[key];
        url = url + "&" + key + "=" + value;
      }

      console.log(url)
    }

    if (navigator.share) {
      navigator.share({
        url: url,
        title: document.title
      });
    } else {
      console.log("Web Share failed");
    }
  }

  /**
   * Validation checks for form entry. Subsequent date times must be equal or later than previous date times.
   */
  $: if (
    isAfter(
      new Date(sleepDate + "T" + sleepTime),
      new Date(putDownDate + "T" + putDownTime)
    ) ||
    isEqual(
      new Date(sleepDate + "T" + sleepTime),
      new Date(putDownDate + "T" + putDownTime)
    )
  ) {
    check2v1 = true;
  } else {
    check2v1 = false;
  }

  $: if (
    isAfter(
      new Date(wakeDate + "T" + wakeTime),
      new Date(sleepDate + "T" + sleepTime)
    ) ||
    isEqual(
      new Date(wakeDate + "T" + wakeTime),
      new Date(sleepDate + "T" + sleepTime)
    )
  ) {
    check3v2 = true;
  } else {
    check3v2 = false;
  }

  $: if (
    isAfter(
      new Date(pickUpDate + "T" + pickUpTime),
      new Date(wakeDate + "T" + wakeTime)
    ) ||
    isEqual(
      new Date(pickUpDate + "T" + pickUpTime),
      new Date(wakeDate + "T" + wakeTime)
    )
  ) {
    check4v3 = true;
  } else {
    check4v3 = false;
  }

  $: sleepDate = putDownDate;

  $: wakeDate = putDownDate;

  $: pickUpDate = putDownDate;

  /**
   * Calculates sleep time by taking the difference between falling asleep and either the current time or wake time (whichever is lower). Also animates the div height to show number of minutes asleep if it is more than zero.
   */
  $: if (
    check2v1 &&
    !check3v2 &&
    isAfter(time, new Date(sleepDate + "T" + sleepTime))
  ) {
    elapsedSleepTime = differenceInMinutes(
      time,
      new Date(sleepDate + "T" + sleepTime)
    );
    /**
     * Tween div height from 0 to 6rem
     */
    elapsedSleepTimeDivHeight.set(6);
  } else if (
    check2v1 &&
    check3v2 &&
    isAfter(
      new Date(wakeDate + "T" + wakeTime),
      new Date(sleepDate + "T" + sleepTime)
    )
  ) {
    elapsedSleepTime = differenceInMinutes(
      new Date(wakeDate + "T" + wakeTime),
      new Date(sleepDate + "T" + sleepTime)
    );
  } else {
    elapsedSleepTime = 0;
    /**
     * Tween div height to 0, hiding the div
     */
    elapsedSleepTimeDivHeight.set(0);
  }

  $: if (nextPutDownTime !== undefined) {
    nextPutDownTimeDivHeight.set(6);
  } else {
    nextPutDownTimeDivHeight.set(0);
  }
</script>

<style type="text/postcss">
  .nap-button {
    @apply bg-accentColor3 text-white text-lg font-medium py-2 px-4 outline-none;
  }
</style>

<svelte:window bind:innerWidth />

{#if sending}
  <div
    transition:fade
    class="w-full h-screen bg-black opacity-75 flex items-center justify-center
    absolute"
    on:click>
    <LoadingSpinner text="Sending" />
  </div>
{/if}
<div
  id="topBlock"
  class="w-full overflow-hidden bg-accentColor text-white"
  style="height: {$nextPutDownTimeDivHeight}rem">
  <body class="text-2xl justify-center items-center flex">
    Next put down ~
    <div
      class="inline-block mx-2 px-3 py-1 rounded-full w-auto text-center
      bg-secondaryColor font-bold text-backgroundColor">
      {nextPutDownTime}
    </div>
  </body>
</div>
{#if innerWidth < 1024}
  <button
    class="mb-20 mr-4 absolute bottom-0 right-0 rounded-full shadow-lg p-4
    bg-accentColor3 outline-none"
    on:click={() => shareParams()}>
    <svg
      class="w-6 h-6 fill-current text-secondaryColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 473.932 473.932">
      <path
        d="M385.513,301.214c-27.438,0-51.64,13.072-67.452,33.09l-146.66-75.002
        c1.92-7.161,3.3-14.56,3.3-22.347c0-8.477-1.639-16.458-3.926-24.224l146.013-74.656c15.725,20.924,40.553,34.6,68.746,34.6
        c47.758,0,86.391-38.633,86.391-86.348C471.926,38.655,433.292,0,385.535,0c-47.65,0-86.326,38.655-86.326,86.326
        c0,7.809,1.381,15.229,3.322,22.412L155.892,183.74c-15.833-20.039-40.079-33.154-67.56-33.154
        c-47.715,0-86.326,38.676-86.326,86.369s38.612,86.348,86.326,86.348c28.236,0,53.043-13.719,68.832-34.664l145.948,74.656
        c-2.287,7.744-3.947,15.79-3.947,24.289c0,47.693,38.676,86.348,86.326,86.348c47.758,0,86.391-38.655,86.391-86.348
        C471.904,339.848,433.271,301.214,385.513,301.214z" />
    </svg>
  </button>
{/if}
<EntryBlock
  title="Put down at"
  date={putDownDate}
  time={putDownTime}
  on:putdownat={receivePutDown} />
<EntryBlock
  title="Fell asleep at"
  date={sleepDate}
  time={sleepTime}
  check={check2v1}
  minDate={putDownDate}
  on:fellasleepat={receiveFellAsleep} />
<div
  class="w-full overflow-hidden bg-accentColor3"
  style="height: {$elapsedSleepTimeDivHeight}rem">
  <body class="text-2xl justify-center items-center flex">
    Asleep for
    <div
      class="inline-block mx-2 px-3 py-1 rounded-full w-auto text-center
      bg-secondaryColor font-bold">
      {elapsedSleepTime}
    </div>
    {elapsedSleepTime === 1 ? 'minute' : 'minutes'}
  </body>
</div>
<EntryBlock
  title="Woke up at"
  date={wakeDate}
  time={wakeTime}
  check={check3v2}
  minDate={sleepDate}
  on:wokeupat={receiveWokeUp} />
<EntryBlock
  title="Picked up at"
  date={pickUpDate}
  time={pickUpTime}
  check={check4v3}
  minDate={wakeDate}
  on:pickedupat={receivePickedUp}>
  <div class="w-full flex justify-center mt-8">
    <div class="inline-flex">
      <button
        class="{isNap ? '' : 'opacity-25'} nap-button rounded-l"
        on:click={() => (isNap = true)}>
        &nbsp;Nap&nbsp;
      </button>
      <button
        class="{!isNap ? '' : 'opacity-25'} nap-button rounded-r"
        on:click={() => (isNap = false)}>
        Sleep
      </button>
    </div>
  </div>
  <div class="flex items-center justify-center w-full">
    <button
      class="py-2 w-1/2 mt-12 mb-24 rounded-lg bg-accentColor2 text-white
      font-medium text-2xl hover:shadow-lg border-b-4 border-teal-700 {check2v1 && check3v2 && check4v3 ? '' : 'opacity-50'}"
      on:click={() => ($userName !== undefined ? validateAndSend() : signIn())}>
      Submit
    </button>
  </div>
</EntryBlock>
