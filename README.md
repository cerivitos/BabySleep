![icon](https://github.com/cerivitos/BabySleep/blob/master/src/assets/favicon-32x32.png)
Baby Sleep Tracker
=============
A personal baby sleep tracker

<img width="240" src="https://github.com/cerivitos/BabySleep/blob/master/babysleep.cerivitos.now.sh_(iPhone%206_7_8%20Plus).png">| 
<img width="240" src="https://github.com/cerivitos/BabySleep/blob/master/babysleep.cerivitos.now.sh_(iPhone%206_7_8).png">| 
<img width="240" src="https://github.com/cerivitos/BabySleep/blob/master/babysleep.cerivitos.now.sh_(iPhone%206_7_8%20Plus)%20(1).png">

![laptop_screen](https://github.com/cerivitos/BabySleep/blob/master/babysleep.cerivitos.now.sh_(Laptop%20with%20MDPI%20screen).png)

# Why?
We practice sleep training for our baby which involves tracking his wake and sleep patterns. Previously, we used a Google Sheet shared between several caregivers. Entering data into the Sheet is unwieldy especially for the less tech savvy, so I created a simple front end.

# Features
- Responsive layout depending on mobile or large screens
- Input form validation before submitting
- Google OAuth2 for sign in and Sheets API for data updating and reading

# Stack
- [Svelte](https://svelte.dev) for front end
- [Tailwind](https://tailwindcss.com) for styling
- [Chart.js](https://chartjs.org) for charts
- Hosted on [Now](https://zeit.co/now)

# Try
As this use case is specific to my needs, the app is not immediately useful to others. If you would like a starter template for Svelte, with built in PWA, Rollup, Tailwind and Now config, head over to [svelte-pwa-now](https://github.com/cerivitos/svelte-pwa-now).

Otherwise, you can play around with this repo by cloning it (make sure you have [NodeJS](https://nodejs.org) installed first). 

Some work is required to set up a project on the [Google Developers Console](https://console.developers.google.com) for authentication and API access. 
1. Follow the instructions [here](https://developers.google.com/sheets/api/quickstart/js).
2. In your cloned repo, replace the *client ID* and *API key* from Step 1 in ```credentials.js``` like so:
```bash
export const credentials = {
  CLIENT_ID: YOUR_NEW_CLIENT_ID,
  API_KEY: YOUR_NEW_API_KEY,
  SCOPES: "https://www.googleapis.com/auth/spreadsheets",
  DISCOVERY_DOCS: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
  ...
};
```

You will then need to create your own [Google Sheet](https://sheets.google.com) to act as the backend. 
1. Simply create a Sheet, and ensure you have Edit rights (which should be automatically assigned if you are the creator).
2. The *Spreadsheet ID* and *Sheet ID* can be found from the URL of your Google Sheet, eg. ```https://docs.google.com/spreadsheets/d/THIS_IS_THE_SPREADSHEET_ID/edit#gid=THIS_IS_THE_SHEET_ID```. The *Sheet Name* is simply the name of the sheet found in the bottom tab.
3. In your cloned repo,  update ```credentials.js``` like so:
```bash
export const credentials = {
  ...
  SPREADSHEET_ID: YOUR_SPREADSHEET_ID,
  SHEET_NAME: YOUR_SHEET_NAME,
  SHEET_ID: YOUR_SHEET_ID
};
```

You're all set! Now,
```bash
npm install
```
and then
```bash
npm run dev
```
will start the app at https://localhost:5000.

Build for production using 
```bash
npm run build
```
and serve the ```dist``` folder.

# Further details
The main data entry logic is located at ```/components/Entry.svelte```. This will be your starting point if you would like to customize how data is recorded to the Google Sheet.

The function [```validateAndSend()```](https://github.com/cerivitos/BabySleep/blob/18e7ee2af4f62ff736239f573ea560997b5575e8/src/components/Entry.svelte#L117) writes to the linked Sheet, including several additional cells of custom formulas related to sleep tracking. You can view the results by opening the Google Sheet after form submission.

The Summary page displays past trends and charts. The component is at ```/components/Summary.svelte```, including functions to plot charts at [```plotTWTVsFirstSleep(data)```](https://github.com/cerivitos/BabySleep/blob/18e7ee2af4f62ff736239f573ea560997b5575e8/src/components/Summary.svelte#L96) and [```plotNapSleepTime(data)```](https://github.com/cerivitos/BabySleep/blob/18e7ee2af4f62ff736239f573ea560997b5575e8/src/components/Summary.svelte#L197). For references on how to use Chart.js, start [here](https://www.chartjs.org/docs/latest/).

# Licence
MIT
