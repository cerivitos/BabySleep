import { userName, userPic, gapiInstance } from "./store/store.js";

export function signIn() {
  gapi.auth2
    .getAuthInstance()
    .signIn()
    .then(response => {
      if (response.El.length > 0) {
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
      }
    });
}

export function signOut() {
  gapi.auth2
    .getAuthInstance()
    .signOut()
    .then(() => {
      userName.set();
      userPic.set();
    });
}
