<script>
  import {
    userName,
    userPic,
    gapiInstance,
    sheetName
  } from "../store/store.js";
  import { onMount } from "svelte";
  import { signOut, signIn } from "../util.js";
  import { fade } from "svelte/transition";
  import { credentials } from "../../credentials.js";
  import LoadingSpinner from "./LoadingSpinner.svelte";

  let loadingSheetName = false;

  onMount(() => {
    if ($sheetName === credentials.SPREADSHEET_ID) {
      getSheetName(credentials.SPREADSHEET_ID);
    }
  });

  function getSheetName(id) {
    loadingSheetName = true;

    if ($gapiInstance !== undefined) {
      $gapiInstance.client.sheets.spreadsheets
        .get({
          spreadsheetId: id
        })
        .then(response => {
          sheetName.set(response.result.properties.title);
          loadingSheetName = false;
        });
    } else {
      loadingSheetName = false;
    }
  }

  function openSheet(id) {
    window.open(`https://docs.google.com/spreadsheets/d/${id}`, "_blank");
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
    @apply text-primaryColor flex-none p-2 rounded fill-current font-medium;
  }

  .input {
    @apply w-8 lowercase border-b-4 text-secondaryColor bg-transparent text-center;
    min-width: 10%;
  }

  label {
    font-family: "Roboto", sans-serif;
    font-size: 1em;
    line-height: 1.5;
    @apply text-secondaryColor;
  }
</style>

<div class="w-full bg-backgroundColor p-4">
  {#if $userName !== undefined && $userPic !== undefined}
    <div class="mt-2 flex-col" in:fade={{ duration: 400 }}>
      <h2>Signed in as</h2>
      <div class="flex items-center">
        <img
          src={$userPic}
          alt="User profile picture"
          class="rounded-full w-8 h-8 mr-2 flex-none" />
        <body class="flex-1">{$userName}</body>
        <button class="button" on:click={() => signOut()}>SIGN OUT</button>
      </div>
    </div>
  {:else}
    <div class="mt-2 flex-col" in:fade={{ duration: 400 }}>
      <h2>Sign in required</h2>
      <div class="flex justify-center">
        <button
          class="flex bg-white rounded shadow text-gray-700 py-2 px-4
          font-medium"
          on:click={() => signIn()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 48 48"
            class="w-6 h-6 pr-2">
            <defs>
              <path
                id="a"
                d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2
                0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6
                4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22
                0-1.3-.2-2.7-.5-4z" />
            </defs>
            <clipPath id="b">
              <use xlink:href="#a" overflow="visible" />
            </clipPath>
            <path clip-path="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z" />
            <path
              clip-path="url(#b)"
              fill="#EA4335"
              d="M0 11l17 13 7-6.1L48 14V0H0z" />
            <path
              clip-path="url(#b)"
              fill="#34A853"
              d="M0 37l30-23 7.9 1L48 0v48H0z" />
            <path
              clip-path="url(#b)"
              fill="#4285F4"
              d="M48 48L17 24l-4-3 35-10z" />
          </svg>
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  {/if}
  <div class="mt-8 flex-col">
    <h2>Connected to</h2>
    <div class="flex items-center">
      {#if loadingSheetName}
        <LoadingSpinner />
      {:else}
        <body class="flex-1 truncate">{$sheetName}</body>
        <button
          class="button"
          on:click={() => openSheet(credentials.SPREADSHEET_ID)}>
          OPEN
        </button>
      {/if}
    </div>
  </div>
</div>
