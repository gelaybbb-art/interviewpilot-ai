const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // For production, replace "*" with your exact GitHub Pages origin.
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, configured: Boolean(env.OPENAI_API_KEY) });
    }
    if (url.pathname !== "/answer" || request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }

    // Small per-isolate rate limiter for demo use. Add durable/global rate limiting before public launch.
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const now = Date.now();
    const limits = globalThis.__limits || (globalThis.__limits = new Map());
    let bucket = limits.get(ip);
    if (!bucket || now - bucket.start > 60_000) bucket = { start: now, count: 0 };
    bucket.count++;
    limits.set(ip, bucket);
    if (bucket.count > 15) return json({ error: "Too many requests. Please wait a minute." }, 429);

    if (!env.OPENAI_API_KEY) return json({ error: "AI API key is not configured on the Worker." }, 503);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Invalid JSON request." }, 400); }

    const question = typeof body.question === "string" ? body.question.trim() : "";
    const candidateProfile = typeof body.candidateProfile === "string" ? body.candidateProfile : "";
    const answerStyle = typeof body.answerStyle === "string" ? body.answerStyle : "natural";
    if (question.length < 5) return json({ error: "Please provide a complete interview question." }, 400);
    if (question.length > 4000) return json({ error: "Question is too long." }, 413);
    if (candidateProfile.length > 6000) return json({ error: "Candidate profile must be under 6,000 characters." }, 400);

    const instructions = [
      "You are InterviewPilot, a concise and ethical interview coach.",
      "Generate a suggested answer for interview practice or assistance where the interviewer and interview rules permit AI assistance.",
      "Never invent qualifications, employers, metrics, achievements, or experiences.",
      "If the candidate profile lacks evidence, provide a customizable example and say it must be personalized truthfully.",
      "Make the answer natural when spoken aloud. Avoid corporate clichés.",
      "For behavioral questions, use a compact STAR structure where useful.",
      "For technical questions, explain the core concept first, then a practical example.",
      "Keep the answer around 90-150 words unless a shorter answer is better.",
      "Return valid JSON with keys: answer (string) and keyPoints (array of 3 short strings)."
    ].join(" ");

    const input = `Interview question:\n${question}\n\nCandidate background (factual grounding only):\n${candidateProfile || "No profile supplied. Do not claim personal experience; provide a customizable sample."}\n\nAnswer style: ${answerStyle}.`;

    try {
      const apiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4.1-mini",
          instructions,
          input,
          text: { format: { type: "json_object" } },
          max_output_tokens: 700
        })
      });
      const result = await apiResponse.json();
      if (!apiResponse.ok) {
        // Avoid returning raw provider details to visitors.
        console.error("AI provider returned status", apiResponse.status);
        return json({ error: "The AI provider rejected the request. Check API key, model access, and API billing." }, 502);
      }

      let outputText = result.output_text;
      if (!outputText && Array.isArray(result.output)) {
        outputText = result.output.flatMap(item => item.content || [])
          .filter(item => item.type === "output_text")
          .map(item => item.text).join("\n");
      }
      let parsed;
      try { parsed = JSON.parse(outputText || "{}"); }
      catch { parsed = { answer: outputText || "", keyPoints: [] }; }
      if (typeof parsed.answer !== "string" || !parsed.answer.trim()) {
        return json({ error: "The AI returned an empty answer. Please try again." }, 502);
      }
      return json({
        answer: parsed.answer.trim(),
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5).map(String) : []
      });
    } catch (error) {
      console.error("AI request failed:", error?.message || error);
      return json({ error: "Could not contact the AI provider right now." }, 502);
    }
  }
};
