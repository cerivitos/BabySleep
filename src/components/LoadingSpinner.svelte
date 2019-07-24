<script>
  export let text;
</script>

<style type="text/postcss">
  .dot {
    animation: scale 1s ease-out infinite, fade 1s ease-out infinite;
    line-height: 0.5;
    @apply text-secondaryColor text-5xl;
  }

  .dot:nth-child(1) {
    animation-delay: 1.7s;
  }

  .dot:nth-child(2) {
    animation-delay: 0.9s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.2s;
  }

  @keyframes scale {
    to {
      transform-origin: center;
      transform: scale(1.2);
    }
  }

  @keyframes fade {
    to {
      opacity: 0;
    }
  }
</style>

<div class="w-full h-auto">
  <div class="flex text-center justify-center items-center">
    <div class="dot">
      <div>·</div>
    </div>
    <div class="dot">
      <div>·</div>
    </div>
    <div class="dot">
      <div>·</div>
    </div>
  </div>
  {#if text !== undefined}
    <body class="w-full text-center text-primaryColor aboslute bottom-0">
      {text}
    </body>
  {/if}
</div>
