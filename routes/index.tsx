import { Head } from "fresh/runtime";
import { define } from "../utils.ts";

export default define.page(function Home() {
  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen flex items-center justify-center">
      <Head>
        <title>Chess</title>
      </Head>
      <div class="max-w-screen-sm w-full mx-auto flex flex-col items-center gap-6 sm:gap-8">
        <h1 class="text-2xl sm:text-4xl font-bold">Chess</h1>
        <div class="flex flex-col gap-4 w-full max-w-xs">
          <a
            href="/play"
            class="text-center px-4 py-3 border-gray-500 border-2 rounded-sm bg-white hover:bg-gray-200 transition-colors text-lg font-semibold"
          >
            Multiplayer
          </a>
          <a
            href="/training"
            class="text-center px-4 py-3 border-gray-500 border-2 rounded-sm bg-white hover:bg-gray-200 transition-colors text-lg font-semibold"
          >
            Training
          </a>
        </div>
      </div>
    </div>
  );
});
