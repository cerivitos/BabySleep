<script>
  import { createEventDispatcher } from "svelte";

  export let date;
  export let time;
  export let title;
  export let check = true;
  export let minDate;

  let isFocused = false;

  const dispatch = createEventDispatcher();

  function dispatchValues() {
    dispatch(title.replace(/\s+/g, "").toLowerCase(), {
      date: date,
      time: time
    });
  }
</script>

<style type="text/postcss">
  .input {
    @apply text-2xl lowercase border-b-4 text-secondaryColor bg-transparent mb-4;
    min-width: 35%;
  }

  .input-ok {
    @apply border-accentColor2;
  }

  .input-error {
    @apply border-accentColor;
  }

  .background {
    @apply bg-backgroundColor text-primaryColor flex flex-col items-center justify-center;
  }

  .background-selected {
    @apply text-accentColor3;
  }

  label {
    @apply text-sm font-medium;
  }
</style>

<div class="background p-4 {isFocused ? 'background-selected' : ''}">
  <h1>
    {title}
    <body>
      <div class="flex-wrap">
        <label for={title.replace(/\s+/g, '').toLowerCase() + '-date'}>
          DATE
        </label>
        <input
          class="input {check ? 'input-ok' : 'input-error'}"
          type="date"
          id={title.replace(/\s+/g, '').toLowerCase() + '-date'}
          bind:value={date}
          on:focus={() => (isFocused = true)}
          on:blur={() => (isFocused = false)}
          on:change={dispatchValues}
          min={minDate} />
      </div>
      <div class="flex-wrap">
        <label for={title.replace(/\s+/g, '').toLowerCase() + '-time'}>
          TIME
        </label>
        <input
          class="input {check ? 'input-ok' : 'input-error'}"
          type="time"
          id={title.replace(/\s+/g, '').toLowerCase() + '-time'}
          bind:value={time}
          on:focus={() => (isFocused = true)}
          on:blur={() => (isFocused = false)}
          on:change={dispatchValues} />
      </div>
    </body>
  </h1>
  <slot />
</div>
