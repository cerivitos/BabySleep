<script>
  import SignInModal from "./components/SignInModal.svelte";
  import Router from "./components/Router.svelte";
  import { onMount } from "svelte";
  import { signedInUser, gAPIInstance } from "./store/store.js";
  import { credentials } from "../credentials.js";

  let googleAuth;

  onMount(() => {
    const gapiScript = document.createElement("script");

    gapiScript.onload = () => {
      gapi.load("auth2", () => {
        gapi.auth2
          .init({
            clientID: credentials.CLIENT_ID,
            scope: credentials.SCOPES,
            discoveryDocs: credentials.DISCOVERY_DOCS
          })
          .then(result => {
            gAPIInstance.set(gapi);

            googleAuth = result;

            if (googleAuth.isSignedIn.get()) {
              signedInUser.set(googleAuth.currentUser.get());

              console.log(
                "Automatically signed in as " +
                  $signedInUser.getBasicProfile().getName()
              );
            }
          });
      });
    };
    gapiScript.src = "https://apis.google.com/js/platform.js";
    document.head.appendChild(gapiScript);
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
</script>

<style lang="postcss">

</style>

<svelte:head>
  <meta name="google-signin-client_id" content={credentials.CLIENT_ID} />
</svelte:head>

<main class="overflow-hidden">
  <Router />
  {#if $signedInUser === undefined || $gAPIInstance !== undefined}
    <SignInModal />
  {/if}
</main>
