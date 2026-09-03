import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(HERE, "..");
const STATIC_FIXTURE = await mkdtemp(path.join(os.tmpdir(), "eqsentry-static-test-"));
await mkdir(path.join(STATIC_FIXTURE, "assets", "js"), { recursive: true });
await writeFile(path.join(STATIC_FIXTURE, ".eqsentry-static-root"), "test bundle\n");
await writeFile(path.join(STATIC_FIXTURE, "index.html"), "<!doctype html><title>EQ Sentry test</title>");
await writeFile(path.join(STATIC_FIXTURE, "about.html"), "<!doctype html><title>About test</title>");
await writeFile(path.join(STATIC_FIXTURE, "assets", "js", "config.js"), "window.EQ_CONFIG = {};\n");

// Set production-like behavior before server.js snapshots process.env.
process.env.NODE_ENV = "production";
process.env.ADMIN_KEY = "integration-test-admin-key";
process.env.ALLOW_ORIGIN = "https://eqsentry.com";
process.env.STATIC_SITE_ROOT = STATIC_FIXTURE;

const { app } = await import("../server.js");

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", (error) => {
      if (error) return reject(error);
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(STATIC_FIXTURE, { recursive: true, force: true });
});

async function json(pathname, options) {
  const response = await fetch(baseUrl + pathname, options);
  return { response, body: await response.json() };
}

test("health endpoint starts under Express 5 with security and CORS headers", async () => {
  const { response, body } = await json("/api/health", {
    headers: { Origin: "https://eqsentry.com" }
  });
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://eqsentry.com");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.has("x-powered-by"), false);
});

test("read-only API endpoints return JSON", async () => {
  for (const pathname of ["/api/stats", "/api/push/key", "/api/reports"]) {
    const response = await fetch(baseUrl + pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(response.headers.get("content-type") || "", /application\/json/);
  }
});

test("invalid API input is rejected without writing records", async () => {
  const badFeed = await json("/api/usgs/not-a-feed");
  assert.equal(badFeed.response.status, 400);
  assert.equal(badFeed.body.error, "bad feed");

  for (const [pathname, body] of [
    ["/api/report", { intensity: 0 }],
    ["/api/subscribe", { consent: false }],
    ["/api/push/subscribe", {}]
  ]) {
    const result = await json(pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    assert.equal(result.response.status, 400, pathname);
  }
});

test("admin endpoints remain protected", async () => {
  const denied = await fetch(baseUrl + "/api/status/history");
  assert.equal(denied.status, 401);

  const allowed = await json("/api/status/history", {
    headers: { "x-admin-key": process.env.ADMIN_KEY }
  });
  assert.equal(allowed.response.status, 200);
  assert.equal(allowed.body.period, "day");
});

test("JSON parser enforces syntax and the 20 KB limit", async () => {
  const malformed = await json("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });
  assert.equal(malformed.response.status, 400);
  assert.equal(malformed.body.error, "invalid request");

  const oversized = await json("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(21 * 1024) })
  });
  assert.equal(oversized.response.status, 413);
  assert.equal(oversized.body.error, "request too large");

  const unsupported = await json("/api/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "made-up"
    },
    body: "{}"
  });
  assert.equal(unsupported.response.status, 415);
  assert.equal(unsupported.body.error, "unsupported content encoding");
});

test("static pages and JavaScript keep the expected content types", async () => {
  for (const pathname of ["/", "/index.html", "/about"]) {
    const response = await fetch(baseUrl + pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
  }

  const script = await fetch(baseUrl + "/assets/js/config.js");
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type") || "", /javascript/);

  const missing = await fetch(baseUrl + "/definitely-not-a-page");
  assert.equal(missing.status, 404);

  const marker = await fetch(baseUrl + "/.eqsentry-static-root");
  assert.equal(marker.status, 404);
});

test("the direct entrypoint reports success and serves health", async () => {
  const portProbe = net.createServer();
  await new Promise((resolve, reject) => {
    portProbe.once("error", reject);
    portProbe.listen(0, "127.0.0.1", resolve);
  });
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));

  const child = spawn(process.execPath, [path.join(SERVER_ROOT, "server.js")], {
    cwd: SERVER_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      ALERT_POLL: "false",
      STATUS_POLL_SECONDS: "0",
      ALLOW_ORIGIN: "*",
      STATIC_SITE_ROOT: path.parse(SERVER_ROOT).root
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const closed = new Promise((resolve) => child.once("close", (code) => resolve(code)));

  let health = null;
  let corsOrigin = null;
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && !health) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        headers: { Origin: "https://local.example" }
      });
      if (response.ok) {
        corsOrigin = response.headers.get("access-control-allow-origin");
        health = await response.json();
      }
    } catch { /* process may still be starting */ }
    if (!health) await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const filesystemRoot = path.parse(process.execPath).root;
  const executablePath = "/" + path.relative(filesystemRoot, process.execPath)
    .split(path.sep).map(encodeURIComponent).join("/");
  const exposed = await fetch(`http://127.0.0.1:${port}${executablePath}`).catch(() => null);

  child.kill();
  let stopTimer;
  try {
    await Promise.race([
      closed,
      new Promise((_, reject) => {
        stopTimer = setTimeout(() => reject(new Error("server did not stop")), 5000);
      })
    ]);
  } finally {
    clearTimeout(stopTimer);
  }

  assert.equal(health && health.ok, true, stderr || "health endpoint never became ready");
  assert.equal(corsOrigin, "*");
  assert.match(stdout, new RegExp(`EQ Sentry server on :${port}`));
  assert.equal(exposed && exposed.status, 404, "filesystem root became web-accessible");
});

test("a port collision exits nonzero and never reports successful startup", async () => {
  const blocker = net.createServer();
  await new Promise((resolve, reject) => {
    blocker.once("error", reject);
    blocker.listen(0, resolve);
  });

  const port = blocker.address().port;
  const child = spawn(process.execPath, [path.join(SERVER_ROOT, "server.js")], {
    cwd: SERVER_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      ALERT_POLL: "false",
      STATUS_POLL_SECONDS: "0"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  const result = await new Promise((resolve) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 5000);
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ timedOut, code });
    });
  });
  await new Promise((resolve) => blocker.close(resolve));

  assert.equal(result.timedOut, false, "conflicting server did not exit");
  assert.notEqual(result.code, 0);
  assert.match(stderr, /unable to listen.*EADDRINUSE/i);
  assert.doesNotMatch(stdout, /EQ Sentry server on/);
});
