// Copyright 2023 the Deno authors. All rights reserved. MIT license.
import { handler } from "./demo.ts";
import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
  isRedirectStatus,
} from "./dev_deps.ts";
import { Status } from "./deps.ts";
import { setTokens, SITE_COOKIE_NAME } from "./src/core.ts";
import { genTokens } from "./src/test_utils.ts";

const baseUrl = "http://localhost";

Deno.test("demo", async (test) => {
  await test.step("non-GET * serves a not found response", async () => {
    const request = new Request(baseUrl, { method: "POST" });
    const response = await handler(request);
    await response.body?.cancel();

    assert(!response.ok);
    assertEquals(response.status, Status.NotFound);
  });

  await test.step("GET non-existent path serves a not found response", async () => {
    const request = new Request(baseUrl + "/nil");
    const response = await handler(request);
    await response.body?.cancel();

    assert(!response.ok);
    assertEquals(response.status, Status.NotFound);
  });

  await test.step("GET / serves a signed-in web page", async () => {
    const sessionId = crypto.randomUUID();
    const tokens = genTokens();
    await setTokens(sessionId, tokens);
    const request = new Request(baseUrl, {
      headers: {
        cookie: `${SITE_COOKIE_NAME}=${sessionId}`,
      },
    });
    const response = await handler(request);
    const html = await response.text();

    assert(response.ok);
    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("content-type"),
      "text/html; charset=utf-8",
    );
    assertStringIncludes(html, tokens.accessToken);
  });

  await test.step("GET / serves a signed-out web page", async () => {
    const request = new Request(baseUrl);
    const response = await handler(request);
    const html = await response.text();

    assert(response.ok);
    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("content-type"),
      "text/html; charset=utf-8",
    );
    assertStringIncludes(html, "Your access token: null");
  });

  await test.step("GET /signin serves a redirect response", async () => {
    const request = new Request(baseUrl + "/signin");
    const response = await handler(request);
    await response.body?.cancel();

    assert(!response.ok);
    assert(isRedirectStatus(response.status));
    assertNotEquals(response.headers.get("location"), null);
  });

  await test.step("GET /callback serves an error response", async () => {
    const request = new Request(baseUrl + "/callback");
    const response = await handler(request);
    await response.body?.cancel();

    assert(!response.ok);
    assertEquals(response.status, Status.InternalServerError);
  });

  await test.step("GET /signout serves a redirect response", async () => {
    const request = new Request(baseUrl + "/signout");
    const response = await handler(request);
    await response.body?.cancel();

    assert(!response.ok);
    assert(isRedirectStatus(response.status));
    assertNotEquals(response.headers.get("location"), null);
  });
});
