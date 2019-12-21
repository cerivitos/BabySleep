<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { gapiInstance, userName } from "../store/store.js";
  import LoadingSpinner from "./LoadingSpinner.svelte";
  import { credentials } from "../../credentials.js";
  import { isSameDay, format } from "date-fns";
  import { convertToMins, convertToDuration } from "../util.js";
  import Chart from "chart.js";

  const historicalRows = 100;
  let loading = false;
  let requiresSignIn = true;
  let showError = false;
  let getTodayData;

  let todayDatas = [];
  let historicalDatas = [];

  let innerWidth;

  function getData() {
    loading = true;
    showError = false;

    $gapiInstance.client.sheets.spreadsheets.values
      .get({
        spreadsheetId: credentials.SPREADSHEET_ID,
        range: credentials.SHEET_NAME + "!A1:A"
      })
      .then(
        response => {
          const lastRow = response.result.values.length;
          const firstRow = lastRow - historicalRows + 1;

          getTodayData = $gapiInstance.client.sheets.spreadsheets.values
            .batchGet({
              spreadsheetId: credentials.SPREADSHEET_ID,
              ranges: [
                credentials.SHEET_NAME + `!A${firstRow}:Q${lastRow}`,
                "NapSleepTrend!A2:D"
              ]
            })
            .then(response => {
              loading = false;

              const sheetData = response.result.valueRanges[0].values;
              const napSleepData = response.result.valueRanges[1].values;

              historicalDatas = sheetData.reverse();

              /**
               * Need to add year to the data from Sheets as it is received as a string
               */
              const year = format(new Date(), "yyyy");

              // for (let i = sheetData.length - 1; i > 15; i--) {
              //   const date = new Date(sheetData[i][0].replace(",", ` ${year}`));
              //   todayDatas.push(sheetData[i]);
              // }

              for (let i = 0; i < sheetData.length; i++) {
                const date = new Date(sheetData[i][2].replace(",", ` ${year}`));

                if (isSameDay(date, new Date())) {
                  if (
                    sheetData[i][0] !== undefined &&
                    sheetData[i][1] !== undefined &&
                    sheetData[i][2] !== undefined &&
                    sheetData[i][3] !== undefined
                  ) {
                    todayDatas.push(sheetData[i]);
                  }
                } else {
                  break;
                }
              }

              todayDatas.reverse();

              plotTWTVsFirstSleep(historicalDatas);
              plotNapSleepTime(napSleepData);
            });
        },
        error => {
          showError = true;
        }
      );
  }

  /**
   * @param {string[]} data Array of sheet data
   * @returns {string} The time component of the put down time, formatted as a string
   */
  async function getPutDownTime(data) {
    let nextPutDown;

    if (data.length > 0) {
      nextPutDown = data[data.length - 1][4].split(", ")[1];
    }

    return nextPutDown !== undefined ? nextPutDown : "";
  }

  function plotTWTVsFirstSleep(data) {
    const ctx = document.getElementById("TWTVsFirstSleep");
    let scatterChartData = [];

    /**
     * Only include data pairs where the Sleep number was 1, but ignore when the Sleep Duration was recorded as 0:00:00 or when the TWT was manually set to 0
     */
    for (let i = 0; i < data.length; i++) {
      if (
        data[i][11] === "Sleep" &&
        data[i][12] === "1" &&
        data[i][6] !== "0:00:00" &&
        data[i][10] !== "0"
      ) {
        const pair = {
          x: convertToMins(data[i][6]),
          y: convertToMins(data[i][10])
        };

        scatterChartData.push(pair);
      }
    }

    Chart.defaults.scale.gridLines.display = false;
    Chart.defaults.global.title.display = true;
    Chart.defaults.global.title.fontColor = "#8D99AE";
    Chart.defaults.global.title.fontSize = 16;
    Chart.defaults.global.title.padding = 16;
    Chart.defaults.global.legend.display = false;

    Chart.scaleService.updateScaleDefaults("linear", {
      scaleLabel: {
        display: true,
        fontColor: "#EDF2F4"
      },
      ticks: {
        fontColor: "#EDF2F4"
      },
      gridLines: {
        color: "#8D99AE"
      }
    });

    let chart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "TWT vs. First Sleep Duration",
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
                "First Sleep Duration: " +
                convertToDuration(tooltipItem.label) +
                " TWT: " +
                convertToDuration(tooltipItem.value)
              );
            }
          }
        },
        title: {
          text: "TWT vs. First Sleep Duration"
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                labelString: "First Sleep Duration"
              },
              ticks: {
                callback: function(label, index, labels) {
                  return convertToDuration(label);
                }
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                labelString: "TWT"
              },
              ticks: {
                callback: function(label, index, labels) {
                  return convertToDuration(label);
                }
              }
            }
          ]
        }
      }
    });
  }

  function plotNapSleepTime(data) {
    const ctx = document.getElementById("napSleepTime");

    let naps = [];
    let sleeps = [];
    let labels = [];

    data.forEach((duration, i) => {
      if (i < historicalRows) {
        naps.push(convertToMins(duration[1]));
        sleeps.push(convertToMins(duration[2]));
        labels.push(duration[0]);
      }
    });

    let chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Nap",
            data: naps,
            backgroundColor: "#FF9F1C",
            borderWidth: 0
          },
          {
            label: "Sleep",
            data: sleeps,
            backgroundColor: "#2EC4B6",
            borderWidth: 0
          }
        ]
      },
      options: {
        aspectRatio: 1,
        tooltips: {
          bodySpacing: 4,
          callbacks: {
            label: (tooltipItem, data) => {
              if (tooltipItem.datasetIndex === 0) {
                return "Nap: " + convertToDuration(tooltipItem.value);
              } else {
                return "Sleep: " + convertToDuration(tooltipItem.value);
              }
            },
            footer: (tooltipItem, data) => {
              let nap = data.datasets[0].data[tooltipItem[0].index];
              let sleep = data.datasets[1].data[tooltipItem[0].index];

              if (Number.isNaN(nap)) {
                nap = 0;
              }

              if (Number.isNaN(sleep)) {
                sleep = 0;
              }

              return "Total: " + convertToDuration(nap + sleep);
            }
          }
        },
        title: {
          text: "Nap and Sleep"
        },
        scales: {
          xAxes: [
            {
              categoryPercentage: 1.0,
              barPercentage: 1.0,
              stacked: true,
              ticks: {
                fontColor: "#EDF2F4",
                callback: function(label, index, labels) {
                  return label.split("-")[2] + "/" + label.split("-")[1];
                }
              },
              gridLines: {
                color: "#8D99AE"
              },
              scaleLabel: {
                labelString: "Date",
                display: true,
                fontColor: "#EDF2F4"
              }
            }
          ],
          yAxes: [
            {
              stacked: true,
              scaleLabel: {
                labelString: "Duration"
              },
              ticks: {
                callback: function(label, index, labels) {
                  return convertToDuration(label);
                }
              }
            }
          ]
        }
      }
    });
  }

  $: if ($userName !== undefined && $gapiInstance !== undefined) {
    requiresSignIn = false;
    showError = false;
    getData();
  } else if ($gapiInstance !== undefined) {
    requiresSignIn = true;
    showError = false;
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

  .graphContainer {
    min-width: 375px;
  }

  .tableContainer {
    min-width: 375px;
  }
</style>

<svelte:window bind:innerWidth />
<div class="w-full bg-backgroundColor p-4">
  {#if loading && !requiresSignIn && !showError}
    <div
      transition:fade
      class="w-full h-screen fixed top-0 left-0 flex flex-col items-center
      justify-center"
      style="background: rgba(0, 0, 0, 0.75);"
      on:click>
      <LoadingSpinner />
    </div>
  {:else if requiresSignIn && !showError}
    <div
      transition:fade
      class="w-full h-screen fixed top-0 left-0 flex flex-col items-center
      justify-center"
      style="background: rgba(0, 0, 0, 0.75);"
      on:click>
      <p class="w-1/2 text-center text-secondaryColor mb-4">
        Sign in to view data
      </p>
      <button
        class="py-2 w-1/2 rounded-lg bg-accentColor text-white font-medium"
        on:click={() => getData()}>
        Retry
      </button>
    </div>
  {:else if showError}
    <div
      transition:fade
      class="w-full h-screen fixed top-0 left-0 flex flex-col items-center
      justify-center"
      style="background: rgba(0, 0, 0, 0.75);"
      on:click>
      <p class="w-1/2 text-center text-secondaryColor mb-4">
        It looks like there was a network error
      </p>
      <button
        class="py-2 w-1/2 rounded-lg bg-accentColor text-white font-medium"
        on:click={() => getData()}>
        Retry
      </button>
    </div>
  {/if}
  <div>
    <h2>Next Put Down</h2>
    {#await getPutDownTime(todayDatas) then nextPutDown}
      <p
        transition:fade
        class="w-full text-center text-accentColor3 font-bold text-2xl">
        {nextPutDown}
      </p>
    {/await}
  </div>
  <div class="mt-8">
    <h2>Today</h2>
    <div transition:fade class="overflow-auto w-full">
      <div
        class={innerWidth >= 375 || todayDatas.length === 0 ? 'w-full' : 'tableContainer'}>
        {#if todayDatas.length > 0}
          <table class="w-full">
            <thead>
              <tr class="text-sm">
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
                {todayData[11]} {todayData[11] === 'Sleep' ? '' : todayData[12]}
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
        {/if}
      </div>
    </div>
  </div>
  <div class="mt-8">
    <h2>Trends</h2>
    <div class="overflow-auto w-full mb-12">
      <div class={innerWidth >= 375 ? 'w-full' : 'graphContainer'}>
        <canvas id="napSleepTime" />
      </div>
    </div>
    <div class="overflow-auto w-full mb-12">
      <div class={innerWidth >= 375 ? 'w-full' : 'graphContainer'}>
        <canvas id="TWTVsFirstSleep" />
      </div>
    </div>
  </div>
</div>
