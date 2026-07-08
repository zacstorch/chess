import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import Chess from "../islands/Chess.tsx";

export default define.page(function Training() {
  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen">
      <Head>
        <title>Chess — Training</title>
      </Head>
      <div class="max-w-screen-md mx-auto flex flex-col items-center">
        <h1 class="text-2xl sm:text-4xl font-bold mb-3 sm:mb-6">Training</h1>
        <Chess />
      </div>
    </div>
  );
});
