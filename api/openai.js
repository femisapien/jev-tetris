// Vercel serverless function: POST /api/openai -> OpenAI /v1/decisions
import { readJsonBody, validateJson, writeResult, jsonResult } from "../lib/typesafe.mjs";
import { forwardToOpenAI } from "../lib/openai.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    writeResult(res, jsonResult(405, { error: { type: "method_not_allowed", message: "Use POST." } }));
    return;
  }
  const body = await readJsonBody(req);
  const invalid = validateJson(body);
  if (invalid) {
    writeResult(res, invalid);
    return;
  }
  writeResult(res, await forwardToOpenAI({ key: req.headers["x-openai-key"] || "", body }));
}
