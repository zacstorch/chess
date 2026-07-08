import { Head } from "fresh/runtime";
import { define } from "../utils.ts";

export default define.page(function Play() {
  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen flex items-center justify-center">
      <Head>
        <title>Chess — Multiplayer</title>
      </Head>
      <div class="max-w-screen-sm w-full mx-auto flex flex-col items-center gap-4 text-center">
        <h1 class="text-2xl sm:text-3xl font-bold">Multiplayer</h1>
        <p class="text-gray-600">Login and matchmaking are coming soon.</p>
        <a href="/" class="underline text-sm">Back</a>
      </div>
    </div>
  );
});
