import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { analysisSchema } from "../schema";
import { QUESTION_SYSTEM_PROMPT, SYSTEM_PROMPT } from "../prompt";
import { LANGUAGES, type Analysis, type AnalyseRequest, type QuestionRequest } from "../types";

const MODEL = process.env.BRIEFHULP_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  // Geen eigen retries: de SDK probeert 429/5xx/netwerkfouten standaard 2x opnieuw.
  client ??= new Anthropic({ timeout: 90_000 });
  return client;
}

export class UserFacingError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

function languagePrompt(code: string) {
  return (LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]).prompt;
}

function formatToday(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function textOf(content: Anthropic.Beta.BetaContentBlock[]) {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function mapApiError(err: unknown): never {
  if (err instanceof UserFacingError) throw err;
  if (err instanceof Anthropic.RateLimitError) {
    throw new UserFacingError("Het is nu heel druk. Probeer het over een minuut opnieuw.", 429);
  }
  if (err instanceof Anthropic.BadRequestError) {
    throw new UserFacingError("Deze foto kon niet worden gelezen. Probeer een andere foto.", 400);
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    console.error("[briefhulp] API-sleutel ongeldig of zonder rechten");
    throw new UserFacingError("De dienst is tijdelijk niet beschikbaar.", 503);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    throw new UserFacingError("Geen verbinding met de uitleg-dienst. Probeer het opnieuw.", 503);
  }
  if (err instanceof Anthropic.APIError) {
    console.error("[briefhulp] API-fout", err.status);
    throw new UserFacingError("Er ging iets mis. Probeer het opnieuw.", 502);
  }
  throw err;
}

export async function analyseLetter(req: AnalyseRequest): Promise<Analysis> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  req.pages.forEach((p, i) => {
    if (req.pages.length > 1) content.push({ type: "text", text: `Bladzijde ${i + 1}:` });
    if (p.mediaType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: p.data } });
    } else {
      content.push({ type: "image", source: { type: "base64", media_type: p.mediaType, data: p.data } });
    }
  });
  content.push({
    type: "text",
    text:
      `Vandaag is het ${formatToday(req.today)} (${req.today}). ` +
      `Schrijf alle uitleg in ${languagePrompt(req.language)}. ` +
      `Leg deze brief uit volgens je instructies.`,
  });

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "medium", format: { type: "json_schema", schema: analysisSchema } },
      // Als een veiligheidsfilter de vraag onterecht weigert, probeert de API het zelf op een ander model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      throw new UserFacingError("Deze brief kon niet worden uitgelegd. Vraag hulp aan iemand die u vertrouwt.", 422);
    }
    if (response.stop_reason === "max_tokens") {
      throw new UserFacingError("De brief is te lang om in één keer uit te leggen. Probeer minder bladzijden.", 422);
    }
    const parsed = JSON.parse(textOf(response.content)) as Analysis;
    return sanitize(parsed);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new UserFacingError("Er ging iets mis bij het uitleggen. Probeer het opnieuw.", 502);
    }
    mapApiError(err);
  }
}

export async function answerQuestion(req: QuestionRequest): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  const intro =
    `Uitleg van de brief (JSON):\n<brief>\n${JSON.stringify(req.analysis)}\n</brief>\n\n` +
    `Antwoord in ${languagePrompt(req.language)}.`;
  const history = req.history.slice(-4);
  history.forEach((h, i) => {
    messages.push({ role: "user", content: i === 0 ? `${intro}\n\nVraag: ${h.q}` : h.q });
    messages.push({ role: "assistant", content: h.a });
  });
  messages.push({ role: "user", content: history.length === 0 ? `${intro}\n\nVraag: ${req.question}` : req.question });

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: QUESTION_SYSTEM_PROMPT,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    });
    if (response.stop_reason === "refusal") {
      return "Op deze vraag kan ik geen antwoord geven. Vraag het aan de afzender van de brief of aan Het Juridisch Loket (0800 - 8020).";
    }
    return textOf(response.content).trim();
  } catch (err) {
    mapApiError(err);
  }
}

// Laatste vangnet: haal een volledig BSN weg als het model het toch zou overnemen.
const BSN_RE = /(?<![\w.])\d(?:[ .-]?\d){8}(?![\w])/g;
function isElfProef(digits: string) {
  if (!/^\d{9}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(digits[i]) * (9 - i);
  sum -= Number(digits[8]);
  return sum % 11 === 0;
}
export function maskBsn(text: string) {
  return text.replace(BSN_RE, (m) => {
    const digits = m.replace(/\D/g, "");
    return isElfProef(digits) ? `*****${digits.slice(-3)}` : m;
  });
}

function sanitize(a: Analysis): Analysis {
  a.references = (a.references ?? []).map((r) => {
    const isBsn = /bsn|burgerservice/i.test(r.label);
    return { label: r.label, value: isBsn ? `*****${r.value.replace(/\D/g, "").slice(-3)}` : maskBsn(r.value) };
  });
  a.summary = maskBsn(a.summary);
  a.headline = maskBsn(a.headline);
  if (a.deadline?.date && !/^\d{4}-\d{2}-\d{2}$/.test(a.deadline.date)) a.deadline.date = null;
  return a;
}
