<script>
  import SignInModal from "./components/SignInModal.svelte";
  import Router from "./components/Router.svelte";
  import SheetTest from "./components/SheetTest.svelte";
  import Entry from "./components/Entry.svelte";
  import { onMount } from "svelte";
  import { signedInUser, gAPIInstance } from "./store/store.js";
  import { credentials } from "../credentials.js";

  let googleAuth;

  onMount(() => {
    const gapiScript = document.createElement("script");

    gapiScript.onload = () => {
      gapi.load("client:auth2", () => {
        gapi.client
          .init({
            clientID: credentials.CLIENT_ID,
            apiKey: credentials.API_KEY,
            scope: credentials.SCOPES,
            discoveryDocs: credentials.DISCOVERY_DOCS
          })
          .then(() => {
            if (gapi.auth2.getAuthInstance() === null) {
              gapi.load("auth2", () => {
                gapi.auth2
                  .init({
                    client_id: credentials.CLIENT_ID,
                    scope: credentials.SCOPES
                  })
                  .then(googleAuth => {
                    gAPIInstance.set(gapi);

                    if (googleAuth.isSignedIn.get()) {
                      signedInUser.set(googleAuth.currentUser.get());

                      console.log(
                        "Automatically signed in as " +
                          $signedInUser.getBasicProfile().getName()
                      );
                    }
                  });
              });
            } else {
              gAPIInstance.set(gapi);

              if (googleAuth.isSignedIn.get()) {
                signedInUser.set(googleAuth.currentUser.get());

                console.log(
                  "Automatically signed in as " +
                    $signedInUser.getBasicProfile().getName()
                );
              }
            }
          });
      });
    };
    gapiScript.src = "https://apis.google.com/js/platform.js";
    document.head.appendChild(gapiScript);
  });

  // if ("serviceWorker" in navigator) {
  //   navigator.serviceWorker.register("/service-worker.js");
  // }
</script>

<style lang="postcss">

</style>

<svelte:head>
  <meta name="google-signin-client_id" content={credentials.CLIENT_ID} />
</svelte:head>

<main class="overflow-hidden">
  <SheetTest />
  <Entry />
  {#if $signedInUser === undefined || $gAPIInstance !== undefined}
    <SignInModal />
  {/if}
</main>
