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

/**
 * Converts a duration in the form "hh:mm:ss" into minutes
 * @param {string} duration A string in the format "hh:mm:ss" representing a duration
 * @returns {number} The duration converted to minutes
 */
export function convertToMins(duration) {
  return (
    parseInt(duration.split(":")[0]) * 60 + parseInt(duration.split(":")[1])
  );
}
