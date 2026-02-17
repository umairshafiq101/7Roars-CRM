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

/**
 * Use Node.js native fetch for multipart/form-data uploads.
 * Electron's net.fetch (Chromium) doesn't properly serialize
 * Node.js Blob/Buffer objects in FormData, resulting in empty/corrupt files.
 */
export async function nodeFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  return globalThis.fetch(input, init);
}
