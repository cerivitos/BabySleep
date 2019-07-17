<script>
  import { onMount } from "svelte";
  import { gAPIInstance } from "../store/store.js";
  import { credentials } from "../../credentials.js";

  // onMount(() => {
  //   renderButton($gAPIInstance);
  // });

  // function renderButton(gapi) {
  //   gapi.signin2.render("my-signin2", {
  //     scope: credentials.SCOPES,
  //     width: 240,
  //     height: 50,
  //     longtitle: true,
  //     theme: "dark"
  //   });
  // }

  function onSignIn() {
    gapi.load("client:auth2", () => {
      gapi.client
        .init({
          clientID: credentials.CLIENT_ID,
          apiKey: credentials.API_KEY,
          scope: credentials.SCOPES,
          discoveryDocs: credentials.DISCOVERY_DOCS
        })
        .then(() => {
          gAPIInstance.set(gapi);

          gapi.auth2.getAuthInstance().signIn();
        });
    });
  }
</script>

<svelte:head>
  <meta name="google-signin-client_id" content={credentials.CLIENT_ID} />
</svelte:head>

<div class="w-full h-screen backgroundColor flex items-center justify-center">
  <div id="g-signin2" data-onsuccess="onSignIn" />
</div>
