<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { gapiInstance } from "../store/store.js";
  import LoadingSpinner from "./LoadingSpinner.svelte";
  import { credentials } from "../../credentials.js";
  import { isSameDay, format } from "date-fns";
  import { convertToMins, convertToDuration } from "../util.js";
  import Chart from "chart.js";
  import "chartjs-adapter-date-fns";

  const historicalRows = 20;
  let loading = true;
  let getTodayData;

  let todayDatas = [];
  let historicalDatas = [];

  let innerWidth;

  function getData() {
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

            // for (let i = sheetData.length - 1; i > 15; i--) {
            //   const date = new Date(sheetData[i][0].replace(",", ` ${year}`));
            //   todayDatas.push(sheetData[i]);
            // }

            for (let i = 0; i < sheetData.length; i++) {
              const date = new Date(sheetData[i][0].replace(",", ` ${year}`));

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
            console.log(todayDatas);

            plotPutDownVsTimeToFallAsleep();
            plotNapSleepTime();
          });
      });
  }

  function plotPutDownVsTimeToFallAsleep() {
    const ctx = document.getElementById("putDownVsTimeToFallAsleep");
    let scatterChartData = [];

    for (let i = 0; i < historicalDatas.length; i++) {
      if (historicalDatas[i][11] === "Sleep") {
        const pair = {
          x: convertToMins(historicalDatas[i][5]),
          y: convertToMins(historicalDatas[i][7])
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
          text: "Put Down vs. Time to Fall Asleep"
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                labelString: "Time to Fall Asleep (min)"
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                labelString: "Put Down (min)"
              }
            }
          ]
        }
      }
    });
  }

  function plotNapSleepTime() {
    const ctx = document.getElementById("napSleepTime");

    let napData = [];
    let sleepData = [];

    for (let i = 0; i < historicalDatas.length; i++) {
      if (historicalDatas[i][11] === "Sleep") {
        sleepData.push({
          date: historicalDatas[i][14],
          duration: historicalDatas[i][6]
        });
      } else if (historicalDatas[i][11] === "Nap") {
        napData.push({
          date: historicalDatas[i][14],
          duration: historicalDatas[i][6]
        });
      }
    }

    const summedNapData = sumSleepDurationsByDate(napData);
    const labels = summedNapData.labels.reverse();
    const napChartData = summedNapData.sums.reverse();
    const sleepChartData = sumSleepDurationsByDate(sleepData).sums.reverse();

    let chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Nap",
            data: napChartData,
            backgroundColor: "#FF9F1C"
          },
          {
            label: "Sleep",
            data: sleepChartData,
            backgroundColor: "#2EC4B6"
          }
        ]
      },
      options: {
        aspectRatio: 1,
        tooltips: {
          callbacks: {
            label: (tooltipItem, data) => {
              if (tooltipItem.datasetIndex === 0) {
                return "Nap: " + convertToDuration(tooltipItem.value);
              } else {
                return "Sleep: " + convertToDuration(tooltipItem.value);
              }
            }
          }
        },
        title: {
          text: "Nap and Sleep"
        },
        scales: {
          xAxes: [
            {
              stacked: true,
              ticks: {
                fontColor: "#EDF2F4"
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

  function sumSleepDurationsByDate(array) {
    let collapsedSums = [];
    let dateLabels = [];
    let returnObj;

    for (let i = 0; i < array.length; i++) {
      let currentTotal = 0;

      if (i > 0 && array[i].date === array[i - 1].date) {
        currentTotal = currentTotal + convertToMins(array[i].duration);
      } else {
        currentTotal = convertToMins(array[i].duration);
        dateLabels.push(array[i].date);
      }

      collapsedSums.push(currentTotal);
    }

    returnObj = {
      labels: dateLabels,
      sums: collapsedSums
    };

    return returnObj;
  }

  $: if ($gapiInstance !== undefined) {
    getData();
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
    scrollbar-width: none;
  }

  .tableContainer {
    min-width: 375px;
    scrollbar-width: none;
  }
</style>

<svelte:window bind:innerWidth />
<div class="w-full bg-backgroundColor p-4">
  <div>
    <h2>Today</h2>
    {#if loading}
      <LoadingSpinner />
    {:else}
      <div transition:fade class="overflow-auto w-full">
        <div class={innerWidth >= 375 ? 'w-full' : 'tableContainer'}>
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
        </div>
      </div>
    {/if}
  </div>
  <div class="mt-8">
    <h2>Trends</h2>
    {#if loading}
      <LoadingSpinner />
    {:else}
      <div />
    {/if}
    <div class="overflow-auto w-full mb-12">
      <div class={innerWidth >= 375 ? 'w-full' : 'graphContainer'}>
        <canvas id="napSleepTime" />
      </div>
    </div>
    <div class="overflow-auto w-full">
      <div class={innerWidth >= 375 ? 'w-full' : 'graphContainer'}>
        <canvas id="putDownVsTimeToFallAsleep" />
      </div>
    </div>
  </div>
</div>
