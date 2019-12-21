<script>
  import { credentials } from "../../credentials.js";
  import { onMount } from "svelte";
  import {
    userName,
    userPic,
    gapiInstance,
    showEntry,
    showSettings,
    showSummary
  } from "../store/store.js";
  import LoadingSpinner from "./LoadingSpinner.svelte";
  import { fade } from "svelte/transition";

  let showErrorScreen = false;
  let showSigningIn = true;
  let auth2;

  onMount(() => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";

    script.onload = () => {
      gapi.load("client:auth2", initClient);
    };

    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });

  function initClient() {
    gapi.client
      .init({
        clientID: credentials.CLIENT_ID,
        apiKey: credentials.API_KEY,
        scope: credentials.SCOPES,
        discoveryDocs: credentials.DISCOVERY_DOCS
      })
      .then(
        () => {
          gapi.load("auth2", initAuth2);
        },
        e => {
          showErrorScreen = true;
        }
      )
      .catch(e => {
        showErrorScreen = true;
      });
  }

  function initAuth2() {
    gapi.auth2
      .init({
        clientID: credentials.CLIENT_ID,
        scope: credentials.SCOPES
      })
      .then(
        () => {
          updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        },
        e => (showErrorScreen = true)
      );
  }

  function updateSigninStatus(signedIn) {
    showSigningIn = false;

    if (signedIn) {
      console.log("Signed in automatically");

      gapiInstance.set(gapi);
      userName.set(
        gapi.auth2
          .getAuthInstance()
          .currentUser.get()
          .getBasicProfile()
          .getName()
      );
      userPic.set(
        gapi.auth2
          .getAuthInstance()
          .currentUser.get()
          .getBasicProfile()
          .getImageUrl()
      );
    } else {
      showErrorScreen = true;
      userName.set();
      userPic.set();
    }
  }
</script>

<svelte:head>
  <meta name="google-signin-client_id" content={credentials.CLIENT_ID} />
</svelte:head>

{#if showSigningIn}
  <div
    transition:fade
    class="w-full h-screen flex items-center justify-center absolute top-0"
    style="background: rgba(0, 0, 0, 0.75);"
    on:click>
    <LoadingSpinner text="Signing in" />
  </div>
{:else}
  <div />
{/if}
{#if showErrorScreen}
  <div
    transition:fade
    class="w-full h-screen fixed top-0 left-0"
    style="background: rgba(0, 0, 0, 0.75);"
    on:click />
  <div
    class="w-full h-screen flex flex-col items-center justify-center fixed top-0
    left-0">
    <p class="w-1/2 text-center text-secondaryColor mb-4">
      You must be signed in to continue.
    </p>
    <button
      class="py-2 w-1/2 rounded-lg bg-accentColor text-white font-medium"
      on:click={() => {
        showEntry.set(false);
        showSummary.set(false);
        showSettings.set(true);
        showErrorScreen = false;
      }}>
      Go to Settings
    </button>
  </div>
{/if}
