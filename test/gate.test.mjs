import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRequestConfirmation } from "../lib/gate.js";

const base = "https://api.holded.com/api/v2";

test("GET and POST pass without confirmation", () => {
  assert.deepEqual(checkRequestConfirmation({ method: "GET", path: "/contacts" }, base), { proceed: true });
  assert.deepEqual(checkRequestConfirmation({ method: "POST", path: "/contacts", body: { name: "x" } }, base), {
    proceed: true,
  });
});

test("DELETE and PUT are refused without confirm and describe the exact request", () => {
  const result = checkRequestConfirmation(
    { method: "DELETE", path: "/invoices/abc", query: { force: true } },
    base
  );
  assert.equal(result.proceed, false);
  assert.match(result.message, /permanently delete/);
  assert.match(result.message, /DELETE https:\/\/api\.holded\.com\/api\/v2\/invoices\/abc\?force=true/);
  assert.match(result.message, /Nothing has been sent/);

  const put = checkRequestConfirmation({ method: "PUT", path: "contacts/1", body: { name: "y" } }, base);
  assert.equal(put.proceed, false);
  assert.match(put.message, /overwrite/);
  assert.match(put.message, /Body: {"name":"y"}/);
});

test("confirm: true lets a gated method through", () => {
  assert.deepEqual(checkRequestConfirmation({ method: "DELETE", path: "/x", confirm: true }, base), {
    proceed: true,
  });
  assert.equal(checkRequestConfirmation({ method: "DELETE", path: "/x", confirm: false }, base).proceed, false);
});
