import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const root = new URL("../dist/", import.meta.url),
  source = fs.readFileSync(new URL("sw.js", root), "utf8");
function harness() {
  const handlers = {},
    entries = new Map(),
    deleted = [],
    store = {
      addAll: async (requests) => {
        for (const request of requests)
          entries.set(
            request.url,
            new Response("cached:" + new URL(request.url).pathname),
          );
      },
      match: async (url) => entries.get(new URL(url).href),
    };
  const self = {
    registration: { scope: "https://example.test/solar-observatory/" },
    clients: { claim: async () => {} },
    addEventListener: (name, handler) => (handlers[name] = handler),
    skipWaiting: () => {},
  };
  vm.runInNewContext(source, {
    self,
    URL,
    Request,
    fetch: () => Promise.reject(Error("offline")),
    caches: {
      open: async () => store,
      keys: async () => [
        "unrelated-cache",
        "solar-observatory-/solar-observatory/-old",
      ],
      delete: async (name) => deleted.push(name),
    },
  });
  return { handlers, entries, deleted };
}
test("manifest provides scoped install metadata and real app icons", () => {
  const m = JSON.parse(fs.readFileSync(new URL("manifest.webmanifest", root)));
  assert.equal(m.start_url, "./");
  assert.equal(m.scope, "./");
  assert.equal(m.display, "standalone");
  for (const icon of m.icons) {
    const b = fs.readFileSync(new URL(icon.src, root)),
      size = Number(icon.sizes.split("x")[0]);
    assert.equal(b.readUInt32BE(16), size);
    assert.equal(b.readUInt32BE(20), size);
  }
});
test("worker precaches all listed files and serves navigation and modules offline under project scope", async () => {
  const h = harness();
  let install;
  h.handlers.install({ waitUntil: (p) => (install = p) });
  await install;
  for (const url of h.entries.keys())
    assert.ok(
      fs.existsSync(
        new URL(new URL(url).pathname.replace("/solar-observatory/", ""), root),
      ),
      url,
    );
  assert.ok(h.entries.size >= 20);
  for (const [path, mode] of [
    ["?utm=test", "navigate"],
    ["main.js?v=old", "cors"],
    ["assets/asteroids.json", "cors"],
  ]) {
    let response;
    h.handlers.fetch({
      request: {
        url: "https://example.test/solar-observatory/" + path,
        method: "GET",
        mode,
      },
      respondWith: (p) => (response = p),
    });
    assert.ok((await (await response).text()).startsWith("cached:"));
  }
});
test("worker leaves other sites and non-GET requests alone; cache cleanup is scoped", async () => {
  const h = harness();
  for (const request of [
    { url: "https://other.test/", method: "GET" },
    { url: "https://example.test/another-app/", method: "GET" },
    { url: "https://example.test/solar-observatory/", method: "POST" },
  ])
    h.handlers.fetch({
      request,
      respondWith: () => assert.fail("out-of-scope request intercepted"),
    });
  let activate;
  h.handlers.activate({ waitUntil: (p) => (activate = p) });
  await activate;
  assert.deepEqual(h.deleted, ["solar-observatory-/solar-observatory/-old"]);
});
