import { net } from "electron";

/**
 * Wrapper around Electron's net.fetch which uses Chromium's network stack.
 * This works correctly in packaged apps where Node.js fetch may not.
 */
export async function electronFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  return net.fetch(input, init as Parameters<typeof net.fetch>[1]);
}
