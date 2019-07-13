<script>
  import {onMount} from 'svelte';

  onMount(() => {
    const gapiScript = document.createElement('script');
    
    gapiScript.onload = () => {
      renderButton();
    };
    gapiScript.src = "https://apis.google.com/js/platform.js";
    document.head.appendChild(gapiScript);
  })

  const CLIENT_ID = "634914729787-buqfp7mh76bjh7bghe50tja5dlojkta8.apps.googleusercontent.com";
  const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

  function onSuccess(googleUser) {
      console.log('Logged in as: ' + googleUser.getBasicProfile().getName() + ' with scopes: ' + googleUser.getGrantedScopes());
    }
    function onFailure(error) {
      console.log(error);
    }
    function renderButton() {
      gapi.signin2.render('my-signin2', {
        'scope': SCOPES,
        'width': 240,
        'height': 50,
        'longtitle': true,
        'theme': 'dark',
        'onsuccess': onSuccess,
        'onfailure': onFailure
      });
    }
</script>

<svelte:head><meta name="google-signin-client_id" content="{CLIENT_ID}">
</svelte:head>

<div id="my-signin2"></div>


