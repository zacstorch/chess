import { page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { createUser, getUser, verifyUserPassword } from "../lib/users.ts";
import { createSession, sessionCookieHeader } from "../lib/session.ts";

interface PlayData {
  error?: string;
  username?: string;
}

export const handler = define.handlers<PlayData>({
  GET() {
    return page({});
  },
  async POST(ctx) {
    const form = await ctx.req.formData();
    const username = (form.get("username")?.toString() ?? "").trim();
    const password = form.get("password")?.toString() ?? "";

    if (!username) {
      return page({ error: "Enter a username." });
    }
    if (!password) {
      return page({ error: "Enter a password.", username });
    }

    const existing = await getUser(username);
    if (existing) {
      const correct = await verifyUserPassword(username, password);
      if (!correct) {
        return page({ error: "Incorrect password.", username });
      }
    } else {
      await createUser(username, password);
    }

    const token = await createSession(username);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/lobby",
        "Set-Cookie": sessionCookieHeader(token),
      },
    });
  },
});

export default define.page<typeof handler>(function Play({ data }) {
  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen flex items-center justify-center">
      <Head>
        <title>Chess — Multiplayer</title>
      </Head>
      <div class="max-w-screen-sm w-full mx-auto flex flex-col items-center gap-6">
        <h1 class="text-2xl sm:text-3xl font-bold">Multiplayer</h1>
        <form method="POST" class="flex flex-col gap-3 w-full max-w-xs">
          {data.error && (
            <p class="text-red-600 text-sm text-center" role="alert">
              {data.error}
            </p>
          )}
          <label class="flex flex-col gap-1 text-sm font-semibold">
            Username
            <input
              type="text"
              name="username"
              value={data.username ?? ""}
              autocomplete="username"
              required
              class="px-3 py-2 border-gray-500 border-2 rounded-sm font-normal"
            />
          </label>
          <label class="flex flex-col gap-1 text-sm font-semibold">
            Password
            <input
              type="password"
              name="password"
              autocomplete="current-password"
              required
              class="px-3 py-2 border-gray-500 border-2 rounded-sm font-normal"
            />
          </label>
          <button
            type="submit"
            class="px-4 py-3 border-gray-500 border-2 rounded-sm bg-white hover:bg-gray-200 transition-colors text-lg font-semibold"
          >
            Continue
          </button>
        </form>
        <a href="/" class="underline text-sm">Back</a>
      </div>
    </div>
  );
});
