// Passthrough proxy for the OpenAI Decisions API, used by the battle page for
// the GPT-6 Luna player. The page sends the visitor's key in an
// `x-openai-key` header; nothing is stored server-side.

import { jsonResult } from "./typesafe.mjs";

export const OPENAI_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com";
const UPSTREAM_TIMEOUT_MS = 30_000;

export async function forwardToOpenAI({ key, body }) {
  if (!key) {
    return jsonResult(401, {
      error: { type: "authentication_error", message: "Enter your OpenAI API key in the page first." },
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(`${OPENAI_BASE}/v1/decisions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      signal: controller.signal,
    });
    const text = await upstream.text();
    const headers = {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    };
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) headers["Retry-After"] = retryAfter;
    const requestId = upstream.headers.get("x-request-id");
    if (requestId) headers["X-Request-Id"] = requestId;
    return { status: upstream.status, headers, body: text };
  } catch (err) {
    const timedOut = err?.name === "AbortError";
    return jsonResult(timedOut ? 504 : 502, {
      error: {
        type: timedOut ? "timeout" : "upstream_error",
        message: timedOut ? "OpenAI API did not answer in time." : `Could not reach OpenAI API: ${err.message}`,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
