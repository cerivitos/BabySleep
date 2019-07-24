import { writable } from "svelte/store";

//Signed in user info
export const userName = writable();
export const userPic = writable();
export const sheetName = writable("");

//gapi instance
export const gapiInstance = writable();

//ui flags
export const showEntry = writable(true);
export const showSummary = writable(false);
export const showSettings = writable(false);
