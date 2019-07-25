<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { gapiInstance } from "../store/store.js";
  import LoadingSpinner from "./LoadingSpinner.svelte";
  import { credentials } from "../../credentials.js";
  import { isSameDay, format } from "date-fns";
  import Chart from "chart.js";

  const historicalRows = 20;
  let loading = false;
  let getTodayData;

  let todayDatas = [];
  let historicalDatas = [];

  function getData() {
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

            historicalDatas = sheetData.reverse();

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

  function plotPutDownVsTimeToFallAsleep() {
    const ctx = document.getElementById("putDownVsTimeToFallAsleep");
    let scatterChartData = [];

    for (let i = 0; i < historicalDatas.length; i++) {
      const pair = {
        x:
          parseInt(historicalDatas[i][5].split(":")[0] * 60) +
          parseInt(historicalDatas[i][5].split(":")[1]),
        y:
          parseInt(historicalDatas[i][7].split(":")[0] * 60) +
          parseInt(historicalDatas[i][7].split(":")[1])
      };
      scatterChartData.push(pair);
    }

    console.log(scatterChartData);

    Chart.defaults.scale.gridLines.display = false;

    let chart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Put Down vs. Time to Fall Asleep",
            data: scatterChartData,
            pointBackgroundColor: "#2EC4B6"
          }
        ]
      },
      options: {
        aspectRatio: 1,
        tooltips: {
          callbacks: {
            label: (tooltipItem, data) => {
              return (
                "Time to Fall Asleep: " +
                tooltipItem.label +
                " Put Down: " +
                tooltipItem.value
              );
            }
          }
        },
        title: {
          display: true,
          fontColor: "#8D99AE",
          text: "Put Down vs. Time to Fall Asleep",
          fontSize: 16,
          padding: 16
        },
        legend: {
          display: false
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: "Time to Fall Asleep (min)",
                fontColor: "#EDF2F4"
              },
              ticks: {
                fontColor: "#EDF2F4"
              },
              gridLines: {
                color: "#8D99AE"
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: "Put Down (min)",
                fontColor: "#EDF2F4"
              },
              ticks: {
                fontColor: "#EDF2F4"
              },
              gridLines: {
                color: "#8D99AE"
              }
            }
          ]
        }
      }
    });
  }

  $: if ($gapiInstance !== undefined) {
    getData();
  }

  $: if (historicalDatas.length > 0) {
    plotPutDownVsTimeToFallAsleep();
  }
</script>

<style type="text/postcss">
  body {
    @apply text-secondaryColor;
  }

  h2 {
    @apply text-primaryColor;
  }

  td {
    @apply px-2 py-1;
    text-align: center;
    vertical-align: center;
  }

  th {
    @apply text-primaryColor font-bold p-2;
  }
</style>

<div class="w-full bg-backgroundColor p-4">
  <div>
    <h2>Today</h2>
    {#await getTodayData}
      <LoadingSpinner />
    {:then}
      <table class="w-full">
        <thead>
          <tr>
            <th>
              <p>Put down</p>
            </th>
            <th>
              <p>Fell asleep</p>
            </th>
            <th>
              <p>Woke up</p>
            </th>
            <th>
              <p>Picked up</p>
            </th>
          </tr>
        </thead>
        {#each todayDatas as todayData}
          <h3 class="text-sm text-accentColor3">
            {todayData[11]} {todayData[12]}
          </h3>
          <tbody>
            <tr class="text-secondaryColor">
              <td>{todayData[0].split(', ')[1].toLowerCase()}</td>
              <td>{todayData[1].split(', ')[1].toLowerCase()}</td>
              <td>{todayData[2].split(', ')[1].toLowerCase()}</td>
              <td>{todayData[3].split(', ')[1].toLowerCase()}</td>
            </tr>
          </tbody>
        {/each}
      </table>
    {/await}
  </div>
  <div class="mt-8">
    <h2>Trends</h2>
    <canvas id="putDownVsTimeToFallAsleep" class="w-full h-48" />
  </div>
</div>
