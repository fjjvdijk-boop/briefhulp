// JSON-schema voor structured outputs. Moet exact overeenkomen met `Analysis` in types.ts.
// Regels voor structured outputs: elk object heeft additionalProperties:false en alle velden in required.

const str = { type: "string" } as const;
const nstr = { type: ["string", "null"] } as const;
const bool = { type: "boolean" } as const;

function obj(properties: Record<string, unknown>) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export const SENDER_TYPES = [
  "belastingdienst",
  "toeslagen",
  "gemeente",
  "zorgverzekeraar",
  "verzekeraar",
  "incassobureau",
  "deurwaarder",
  "cjib",
  "rechtbank",
  "uwv",
  "svb",
  "duo",
  "bank",
  "energie",
  "woning",
  "zorg",
  "werk",
  "school",
  "overig",
];

export const analysisSchema = obj({
  is_letter: bool,
  readable: bool,
  photo_tip: nstr,
  sender: obj({ name: str, type: { type: "string", enum: SENDER_TYPES } }),
  letter_type: str,
  headline: str,
  summary: str,
  urgency: obj({ level: { type: "string", enum: ["rood", "oranje", "groen"] }, reason: str }),
  actions: { type: "array", items: obj({ step: str, detail: nstr }) },
  deadline: obj({ date: nstr, what: nstr, is_estimate: bool }),
  amounts: { type: "array", items: obj({ amount: str, description: str }) },
  payment: obj({ needed: bool, amount: nstr, iban: nstr, to: nstr, reference: nstr }),
  references: { type: "array", items: obj({ label: str, value: str }) },
  contact: obj({ phone: nstr, website: nstr, email: nstr }),
  objection: obj({ possible: bool, deadline: nstr, how: nstr }),
  if_you_do_nothing: nstr,
  difficult_words: { type: "array", items: obj({ word: str, meaning: str }) },
  scam_check: obj({ suspicious: bool, signals: { type: "array", items: str } }),
  help: { type: "array", items: obj({ name: str, why: str, contact: nstr }) },
});
