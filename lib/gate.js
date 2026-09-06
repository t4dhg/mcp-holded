// Confirmation gate for the low-level holded_request tool.
//
// DELETE removes a record for good and PUT overwrites one. A model acting on a
// mistaken or injected instruction must not be able to do either in a single
// step, so both need `confirm: true`. The first call makes no request and
// returns exactly what would be sent. GET and POST are not gated: reads are
// harmless and a create adds a record without touching an existing one.

export const GATED_METHODS = new Set(["DELETE", "PUT"]);

/**
 * @param {{ method: string, path: string, query?: object, body?: object, confirm?: boolean }} call
 * @param {string} baseUrl
 * @returns {{ proceed: true } | { proceed: false, message: string }}
 */
export function checkRequestConfirmation(call, baseUrl) {
  if (!GATED_METHODS.has(call.method) || call.confirm === true) {
    return { proceed: true };
  }
  const url = new URL(baseUrl + (call.path.startsWith("/") ? call.path : `/${call.path}`));
  for (const [k, v] of Object.entries(call.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const verb = call.method === "DELETE" ? "permanently delete" : "overwrite";
  const body = call.body != null ? `\nBody: ${JSON.stringify(call.body)}` : "";
  return {
    proceed: false,
    message:
      `This would ${verb} a Holded record and cannot be undone:\n` +
      `${call.method} ${url.toString()}${body}\n\n` +
      "Nothing has been sent. To proceed, call this tool again with the same arguments and `confirm: true`.",
  };
}
