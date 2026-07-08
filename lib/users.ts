import { hashPassword, verifyPassword } from "./auth.ts";
import { getKv } from "./kv.ts";

export interface User {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

function userKey(username: string) {
  return ["users", username.toLowerCase()];
}

export async function getUser(username: string): Promise<User | null> {
  const kv = await getKv();
  const entry = await kv.get<User>(userKey(username));
  return entry.value;
}

export async function createUser(
  username: string,
  password: string,
): Promise<User> {
  const kv = await getKv();
  const { hash, salt } = await hashPassword(password);
  const user: User = {
    username,
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString(),
  };
  // Atomic check-and-set: fails if the username was created concurrently
  // between an earlier getUser() lookup and this write.
  const result = await kv.atomic()
    .check({ key: userKey(username), versionstamp: null })
    .set(userKey(username), user)
    .commit();
  if (!result.ok) {
    throw new Error("Username was just taken — try again");
  }
  return user;
}

export async function verifyUserPassword(
  username: string,
  password: string,
): Promise<boolean> {
  const user = await getUser(username);
  if (!user) return false;
  return verifyPassword(password, user.salt, user.passwordHash);
}
