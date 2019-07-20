<script>
  import { onMount } from "svelte";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
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

  /**
   * Validation checks to verify if the inputted date time is after the date time of he previous field
   * @type {boolean}
   */
  let check2v1 = true;
  let check3v2 = true;
  let check4v3 = true;

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

  /**
   * Ensures all validation criteria are met before sending to Sheets API
   */
  function validateAndSend() {
    if (
      check2v1 &&
      check3v2 &&
      check4v3 &&
      $gapiInstance.client.sheets !== null
    ) {
      $gapiInstance.client.sheets.spreadsheets.values
        .append({
          spreadsheetId: credentials.SHEET_ID,
          range: "Sheet1",
          valueInputOption: "USER_ENTERED",
          resource: {
            values: [
              [
                putDownDate + " " + putDownTime,
                sleepDate + " " + sleepTime,
                wakeDate + " " + wakeTime,
                pickUpDate + " " + pickUpTime
              ]
            ]
          }
        })
        .then(response => {
          if (response.status == 200) {
            $gapiInstance.client.sheets.spreadsheets
              .batchUpdate({
                spreadsheetId: credentials.SHEET_ID,
                requests: [
                  {
                    repeatCell: {
                      range: {
                        sheetId: 0,
                        startRowIndex: 1,
                        startColumnIndex: 0,
                        endColumnIndex: 4
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
              .then(response => console.log(response));
          }
        });
    } else {
    }
  }

  function receivePutDown(event) {
    putDownDate = event.detail.date;
    putDownTime = event.detail.time;
  }

  function receiveFellAsleep(event) {
    sleepDate = event.detail.date;
    sleepTime = event.detail.time;
  }

  function receiveWokeUp(event) {
    wakeDate = event.detail.date;
    wakeTime = event.detail.time;
  }

  function receivePickedUp(event) {
    pickUpDate = event.detail.date;
    pickUpTime = event.detail.time;
  }

  /**
   * Validation checks for form entry. Subsequent date times must be equal or later than previous date times.
   */
  $: if (
    isAfter(
      new Date(sleepDate + " " + sleepTime),
      new Date(putDownDate + " " + putDownTime)
    ) ||
    isEqual(
      new Date(sleepDate + " " + sleepTime),
      new Date(putDownDate + " " + putDownTime)
    )
  ) {
    check2v1 = true;
  } else {
    check2v1 = false;
  }

  $: if (
    isAfter(
      new Date(wakeDate + " " + wakeTime),
      new Date(sleepDate + " " + sleepTime)
    ) ||
    isEqual(
      new Date(wakeDate + " " + wakeTime),
      new Date(sleepDate + " " + sleepTime)
    )
  ) {
    check3v2 = true;
  } else {
    check3v2 = false;
  }

  $: if (
    isAfter(
      new Date(pickUpDate + " " + pickUpTime),
      new Date(wakeDate + " " + wakeTime)
    ) ||
    isEqual(
      new Date(pickUpDate + " " + pickUpTime),
      new Date(wakeDate + " " + wakeTime)
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
    isAfter(time, new Date(sleepDate + " " + sleepTime))
  ) {
    elapsedSleepTime = differenceInMinutes(
      time,
      new Date(sleepDate + " " + sleepTime)
    );
    /**
     * Tween div height from 0 to 6rem
     */
    elapsedSleepTimeDivHeight.set(6);
  } else if (
    check2v1 &&
    check3v2 &&
    isAfter(
      new Date(wakeDate + " " + wakeTime),
      new Date(sleepDate + " " + sleepTime)
    )
  ) {
    elapsedSleepTime = differenceInMinutes(
      new Date(wakeDate + " " + wakeTime),
      new Date(sleepDate + " " + sleepTime)
    );
  } else {
    elapsedSleepTime = 0;
    /**
     * Tween div height to 0, hiding the div
     */
    elapsedSleepTimeDivHeight.set(0);
  }

  // function signIn() {
  //   gapi.auth2
  //     .getAuthInstance()
  //     .signIn()
  //     .then(response => {
  //       if (response.El.length > 0) {
  //         gapiInstance.set(gapi);
  //         userName.set(
  //           gapi.auth2
  //             .getAuthInstance()
  //             .currentUser.get()
  //             .getBasicProfile()
  //             .getName()
  //         );
  //         userName.set(
  //           gapi.auth2
  //             .getAuthInstance()
  //             .currentUser.get()
  //             .getBasicProfile()
  //             .getImageUrl()
  //         );
  //       } else {
  //         console.log("Failed to sign in");
  //       }
  //     });
  // }
</script>

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
      class="inline-block mx-2 px-2 py-1 rounded-full w-auto text-center
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
  <div class="flex items-center justify-center">
    <button
      class="py-2 w-1/2 mt-12 mb-24 rounded-lg bg-accentColor2 text-white
      text-2xl font-bold hover:shadow-lg border-b-4 border-teal-700 {check2v1 && check3v2 && check4v3 ? '' : 'opacity-50'}"
      on:click={() => ($userName !== undefined ? validateAndSend() : signIn())}>
      Submit
    </button>
  </div>
</EntryBlock>
