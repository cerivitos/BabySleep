import { writable } from "svelte/store";

//Signed in user info
export const userName = writable();
export const userPic = writable();

//gapi instance
export const gapiInstance = writable();
