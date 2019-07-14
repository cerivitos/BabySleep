<script>
  import { gAPIInstance } from "../store/store.js";

  $: if ($gAPIInstance !== undefined) {
    $gAPIInstance.client.sheets.spreadsheets.values
      .get({
        spreadsheetId: "1XcXToo9F79vB-YoooATQhAY8Kb57uSpEEWdMa8gJSRw",
        range: "Sheet1!A726:O"
      })
      .then(response => {
        console.table(response.result.values);
      });
  }
</script>
