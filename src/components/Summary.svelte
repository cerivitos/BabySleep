<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { gapiInstance } from "../store/store.js";
  import LoadingSpinner from "./LoadingSpinner.svelte";
  import { credentials } from "../../credentials.js";
  import { isSameDay, format } from "date-fns";

  const historicalRows = 20;
  let loading = false;
  let getTodayData;

  let todayDatas = [];

  onMount(() => {
    if ($gapiInstance !== undefined) {
      loading = true;

      $gapiInstance.client.sheets.spreadsheets.values
        .get({
          spreadsheetId: credentials.SPREADSHEET_ID,
          range: credentials.SHEET_NAME + "!A1:A"
        })
        .then(response => {
          const lastRow = response.result.values.length;
          const firstRow = lastRow - historicalRows + 1;

          getTodayData = $gapiInstance.client.sheets.spreadsheets.values
            .get({
              spreadsheetId: credentials.SPREADSHEET_ID,
              range: credentials.SHEET_NAME + `!A${firstRow}:Q${lastRow}`
            })
            .then(response => {
              loading = false;
              console.log(response);
              const sheetData = response.result.values;
              /**
               * Need to add year to the data from Sheets as it is received as a string
               */
              const year = format(new Date(), "yyyy");

              for (let i = sheetData.length - 1; i > 15; i--) {
                const date = new Date(sheetData[i][0].replace(",", ` ${year}`));
                todayDatas.push(sheetData[i]);
              }

              // for (let i = sheetData.length - 1; i > 0; i--) {
              //   const date = new Date(sheetData[i][0].replace(",", ` ${year}`));

              //   if (isSameDay(date, new Date())) {
              //     todayDatas.push(sheetData[i]);
              //   } else {
              //     break;
              //   }
              // }

              todayDatas.reverse();
              console.log(todayDatas);
            });
        });
    }
  });
</script>

<style type="text/postcss">
  body {
    @apply text-secondaryColor;
  }

  h2 {
    @apply text-primaryColor;
  }

  h3 {
    @apply text-primaryColor m-0;
  }

  th,
  td {
    @apply px-2 py-1;
    text-align: center;
    vertical-align: center;
  }

  .category {
    @apply rounded-full uppercase bg-accentColor2 text-secondaryColor text-sm font-medium mt-4 mb-2 py-1 px-2 shadow;
    width: fit-content;
  }

  .cell {
    @apply text-secondaryColor;
  }
</style>

<div class="w-full bg-backgroundColor p-4">
  <div class="mt-8">
    <h2>Today</h2>
    {#await getTodayData}
      <LoadingSpinner />
    {:then}
      {#each todayDatas as todayData}
        <div class="category">{todayData[11]} {todayData[12]}</div>
        <table class="w-full">
          <thead>
            <tr>
              <th>
                <h3>Put down</h3>
              </th>
              <th>
                <h3>Fell asleep</h3>
              </th>
              <th>
                <h3>Woke up</h3>
              </th>
              <th>
                <h3>Picked up</h3>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="cell">
              <td>{todayData[0].split(', ')[1].toLowerCase()}</td>
              <td>{todayData[1].split(', ')[1].toLowerCase()}</td>
              <td>{todayData[2].split(', ')[1].toLowerCase()}</td>
              <td>{todayData[3].split(', ')[1].toLowerCase()}</td>
            </tr>
          </tbody>
        </table>
      {/each}
    {/await}
  </div>
</div>
