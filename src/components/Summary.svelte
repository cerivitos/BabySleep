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
          .batchGet({
            spreadsheetId: credentials.SPREADSHEET_ID,
            ranges: [
              credentials.SHEET_NAME + `!A${firstRow}:Q${lastRow}`,
              "NapSleepTrend!A2:D"
            ]
          })
          .then(response => {
            loading = false;

            console.log(response);
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

            plotPutDownVsTimeToFallAsleep(historicalDatas);
            plotNapSleepTime(napSleepData);
          });
      });
  }

  function plotPutDownVsTimeToFallAsleep(data) {
    const ctx = document.getElementById("putDownVsTimeToFallAsleep");
    let scatterChartData = [];

    for (let i = 0; i < data.length; i++) {
      if (data[i][11] === "Sleep") {
        const pair = {
          x: convertToMins(data[i][5]),
          y: convertToMins(data[i][7])
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
