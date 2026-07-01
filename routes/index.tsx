import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import Chess from "../islands/Chess.tsx";

export default define.page(function Home() {
  return (
    <div class="px-4 py-8 mx-auto min-h-screen">
      <Head>
        <title>Chess</title>
      </Head>
      <div class="max-w-screen-md mx-auto flex flex-col items-center">
        <h1 class="text-4xl font-bold mb-6">Chess</h1>
        <Chess />
      </div>
    </div>
  );
});
