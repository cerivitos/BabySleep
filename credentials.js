export const credentials = {
  //For production deployment on Now
  CLIENT_ID: process.env.CLIENT_ID,
  API_KEY: process.env.API_KEY,
  SCOPES: process.env.SCOPES,
  DISCOVERY_DOCS: [process.env.DISCOVERY_DOCS],
  SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  SHEET_NAME: process.env.SHEET_NAME,
  SHEET_ID: parseInt(process.env.SHEET_ID)
};
