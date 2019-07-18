<script>
  import { credentials } from "../../credentials.js";
  import { onMount } from "svelte";
  import { userName, userPic, gapiInstance } from "../store/store.js";

  let isSignedIn = false;
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
      .then(() => {
        gapi.load("auth2", initAuth2);
      });
  }

  function initAuth2() {
    gapi.auth2
      .init({
        clientID: credentials.CLIENT_ID,
        scope: credentials.SCOPES
      })
      .then(() => {
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      });
  }

  function updateSigninStatus(signedIn) {
    if (signedIn) {
      console.log("Signed in automatically");
      isSignedIn = true;

      gapiInstance.set(gapi);
      userName.set(
        gapi.auth2
          .getAuthInstance()
          .currentUser.get()
          .getBasicProfile()
          .getName()
      );
      userName.set(
        gapi.auth2
          .getAuthInstance()
          .currentUser.get()
          .getBasicProfile()
          .getImageUrl()
      );
    } else {
      isSignedIn = false;
      userName.set();
      userName.set();
    }
  }

  function signIn() {
    gapi.auth2
      .getAuthInstance()
      .signIn()
      .then(response => {
        response.El.length > 0 ? (isSignedIn = true) : (isSignedIn = false);

        gapiInstance.set(gapi);
        userName.set(
          gapi.auth2
            .getAuthInstance()
            .currentUser.get()
            .getBasicProfile()
            .getName()
        );
        userName.set(
          gapi.auth2
            .getAuthInstance()
            .currentUser.get()
            .getBasicProfile()
            .getImageUrl()
        );
      });
  }

  function signOut() {
    gapi.auth2
      .getAuthInstance()
      .signOut()
      .then(() => {
        isSignedIn = false;

        userName.set();
        userName.set();
      });
  }
</script>

<svelte:head>
  <meta name="google-signin-client_id" content={credentials.CLIENT_ID} />
</svelte:head>

{#if !isSignedIn}
  <button
    class="w-1/2 p-4 rounded {isSignedIn ? 'bg-secondaryColor opacity-50 cursor-not-allowed' : 'bg-accentColor'}
    text-center text-backgroundColor"
    on:click={() => signIn()}>
    Sign In
  </button>
{/if}
{#if isSignedIn}
  <button
    class="w-1/2 p-4 rounded {!isSignedIn ? 'bg-secondaryColor opacity-50 cursor-not-allowed' : 'bg-accentColor'}
    text-center text-backgroundColor"
    on:click={() => signOut()}>
    Sign out
  </button>
{/if}
