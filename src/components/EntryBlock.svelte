<script>
  export let date;
  export let time;
  export let title;
  export let check = true;
  export let minDate;

  let isFocused = false;
</script>

<style type="text/postcss">
  .input {
    @apply text-2xl lowercase border-b-4 text-secondaryColor bg-transparent mb-4 w-auto;
  }

  .input-ok {
    @apply border-accentColor2;
  }

  .input-error {
    @apply border-accentColor;
  }

  .background {
    @apply bg-backgroundColor text-primaryColor;
  }

  .background-selected {
    @apply text-accentColor3;
  }
</style>

<div class="background p-4 {isFocused ? 'background-selected' : ''}">
  <h1>
    {title}
    <body>
      <input class="input {check ? 'input-ok' : 'input-error'}" type="date" bind:value={date} on:focus={() => isFocused = true} on:blur={() => isFocused = false} min={minDate}/>
      <input class="input {check ? 'input-ok' : 'input-error'}" type="time" bind:value={time} on:focus={() => isFocused = true} on:blur={() => isFocused = false} />
    </body>
  </h1>
  <slot></slot>
</div>