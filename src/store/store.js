import { writable } from "svelte/store";
import { credentials } from "../../credentials.js";

//Signed in user info
export const userName = writable();
export const userPic = writable();
export const sheetName = writable(credentials.SPREADSHEET_ID);

//gapi instance
export const gapiInstance = writable();

//ui flags
export const showEntry = writable(true);
export const showSummary = writable(false);
export const showSettings = writable(false);
