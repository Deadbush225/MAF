const SYSTEM_PROMPT = `You are an AI intake triage assistant for a medical clinic.
Your ONLY job is to help clinic staff prioritize appointment scheduling based on reported symptoms.
You are NOT a doctor. Do NOT provide diagnoses, prescribe treatments, or give medical advice.
The patient may speak in English, Tagalog, or Taglish.

Analyze the reported symptoms and determine how urgently this patient needs an appointment.
Return strict JSON only, in this exact format:
{
  "urgency": "LOW | MEDIUM | HIGH",
  "summary": "A brief, objective description of the reported symptoms for clinic staff — describe what was said, not what you think is wrong",
  "possible_issue": "Broad symptom category only (e.g. 'Respiratory symptoms', 'Gastrointestinal complaint', 'Musculoskeletal discomfort') — never a specific diagnosis",
  "recommendation": "Scheduling action only — e.g. 'Book the next available urgent slot today', 'Schedule appointment within 24–48 hours', 'Routine appointment within the week is appropriate'",
  "confidence": <integer 0-100 reflecting how clearly the urgency level can be determined>,
  "missing_info_questions": ["question 1", "question 2"]
}
Rules:
- HIGH: Patient may need to be seen within hours. Recommend an urgent same-day booking or direct the patient to emergency services if no slot is available.
- MEDIUM: Patient should be seen today or within 24–48 hours. Recommend a priority booking.
- LOW: Routine scheduling within the week is appropriate.
- summary: neutral, objective. Describe reported symptoms only.
- possible_issue: symptom category only — never a diagnosed condition like "appendicitis" or "GERD".
- recommendation: clinic workflow only — scheduling, walk-in, or ER referral. Never suggest medications, tests, or treatments.
- confidence: 90+ if pattern is very clear, 60–89 if partially clear, below 60 if vague or insufficient.
- missing_info_questions: max 2 questions to clarify urgency; empty array [] if information is already sufficient.
- missing_info_questions: write questions in natural Tagalog.
- NEVER act as a physician. A licensed doctor will evaluate the patient.`;

const SYMPTOM_SIGNAL_MAP = [
  { label: "Chest pain", terms: ["chest pain", "masakit dibdib", "pananakit ng dibdib", "dibdib"] },
  {
    label: "Shortness of breath",
    terms: [
      "shortness of breath",
      "difficulty breathing",
      "nahihirapan huminga",
      "nahihirapan akong huminga",
      "hingal",
      "hirap huminga",
    ],
  },
  { label: "Severe bleeding", terms: ["severe bleeding", "heavy bleeding", "malakas na pagdurugo", "dumudugo"] },
  { label: "One-sided weakness", terms: ["one sided weakness", "left side weak", "right side weak", "nanghihina"] },
  { label: "Facial droop", terms: ["face droop", "facial droop", "tabingi ang mukha", "nakalaylay ang mukha"] },
  { label: "Slurred speech", terms: ["slurred speech", "hirap magsalita", "garalgal magsalita"] },
  { label: "Fever", terms: ["fever", "lagnat"] },
  { label: "Headache", terms: ["headache", "sakit ng ulo"] },
  { label: "Cough", terms: ["cough", "ubo"] },
  { label: "Sore throat", terms: ["sore throat", "masakit lalamunan", "makating lalamunan"] },
  { label: "Dizziness", terms: ["dizziness", "nahihilo", "pagkahilo"] },
  { label: "Vomiting", terms: ["vomiting", "vomit", "suka", "nagsusuka"] },
  { label: "Diarrhea", terms: ["diarrhea", "pagtatae", "malabnaw na dumi"] },
];

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function extractMatchedSymptoms(symptoms) {
  const text = symptoms.toLowerCase();
  const matched = [];

  for (const signal of SYMPTOM_SIGNAL_MAP) {
    if (includesAny(text, signal.terms)) {
      matched.push(signal.label);
    }
  }

  return [...new Set(matched)];
}

function detectEmergencyRedFlags(symptoms) {
  const text = symptoms.toLowerCase();

  const hasChestPain = includesAny(text, ["chest pain", "masakit dibdib", "pananakit ng dibdib", "dibdib"]);
  const hasBreathingIssue = includesAny(text, [
    "shortness of breath",
    "difficulty breathing",
    "nahihirapan huminga",
    "nahihirapan akong huminga",
    "hirap huminga",
    "hingal",
  ]);

  if (hasChestPain && hasBreathingIssue) {
    return {
      urgency: "HIGH",
      summary: "Patient reports chest pain combined with breathing difficulty.",
      possible_issue: "Cardiopulmonary symptoms",
      recommendation: "Direct patient to the nearest emergency room immediately — do not wait for a routine appointment.",
      urgency_reasons: ["Chest pain", "Shortness of breath"],
      safety_override: true,
      safety_message: "Please go to the nearest emergency room or call emergency services immediately.",
      confidence: 99,
      missing_info_questions: [],
    };
  }

  const hasSevereBleeding = includesAny(text, [
    "severe bleeding",
    "heavy bleeding",
    "malakas na pagdurugo",
    "dumudugo nang marami",
  ]);

  if (hasSevereBleeding) {
    return {
      urgency: "HIGH",
      summary: "Patient reports severe or heavy bleeding.",
      possible_issue: "Bleeding symptoms",
      recommendation: "Direct patient to the nearest emergency room immediately.",
      urgency_reasons: ["Severe bleeding"],
      safety_override: true,
      safety_message: "Please go to the nearest emergency room or call emergency services immediately.",
      confidence: 99,
      missing_info_questions: [],
    };
  }

  const hasStrokeKeyword = includesAny(text, ["stroke", "na-stroke", "signs of stroke"]);
  const hasFaceDroop = includesAny(text, ["face droop", "facial droop", "tabingi ang mukha", "nakalaylay ang mukha"]);
  const hasSpeechIssue = includesAny(text, ["slurred speech", "hirap magsalita", "garalgal magsalita"]);
  const hasOneSidedWeakness = includesAny(text, ["one sided weakness", "left side weak", "right side weak", "nanghihina"]);

  if (hasStrokeKeyword || (hasFaceDroop && (hasSpeechIssue || hasOneSidedWeakness))) {
    const reasons = ["Stroke warning signs"];
    if (hasFaceDroop) reasons.push("Facial droop");
    if (hasSpeechIssue) reasons.push("Slurred speech");
    if (hasOneSidedWeakness) reasons.push("One-sided weakness");

    return {
      urgency: "HIGH",
      summary: "Patient reports possible stroke warning signs.",
      possible_issue: "Neurological symptoms",
      recommendation: "Direct patient to the nearest emergency room immediately — do not wait.",
      urgency_reasons: reasons,
      safety_override: true,
      safety_message: "Please go to the nearest emergency room or call emergency services immediately.",
      confidence: 99,
      missing_info_questions: [],
    };
  }

  return null;
}

function buildUrgencyReasons(symptoms, urgency) {
  const matchedSymptoms = extractMatchedSymptoms(symptoms);

  if (matchedSymptoms.length > 0) {
    return matchedSymptoms.slice(0, 4);
  }

  if (urgency === "HIGH") {
    return ["Severe symptom pattern reported", "Urgent appointment recommended"];
  }
  if (urgency === "MEDIUM") {
    return ["Moderate symptom pattern reported", "Priority appointment recommended"];
  }
  return ["Mild symptom pattern reported", "Routine appointment is appropriate"];
}

function cleanJsonResponse(rawText) {
  const trimmed = rawText.trim();

  if (trimmed.startsWith("{")) return trimmed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function normalizeResult(result = {}) {
  const urgency = ["LOW", "MEDIUM", "HIGH"].includes(String(result.urgency).toUpperCase())
    ? String(result.urgency).toUpperCase()
    : "LOW";

  const rawConfidence = Number(result.confidence);
  const confidence =
    !isNaN(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 100 ? Math.round(rawConfidence) : 60;

  return {
    urgency,
    summary: result.summary || "No summary provided.",
    possible_issue: result.possible_issue || "Symptom area to be determined by the attending physician.",
    recommendation: result.recommendation || "Schedule an appointment and monitor symptoms until seen.",
    urgency_reasons: Array.isArray(result.urgency_reasons)
      ? result.urgency_reasons.filter((item) => typeof item === "string" && item.trim().length > 0)
      : [],
    safety_override: Boolean(result.safety_override),
    safety_message: result.safety_message || "",
    confidence,
    missing_info_questions: Array.isArray(result.missing_info_questions)
      ? result.missing_info_questions
          .filter((q) => typeof q === "string" && q.trim().length > 0)
          .slice(0, 2)
      : [],
  };
}

function buildTagalogFollowUpQuestions(symptoms, urgency, possibleIssue) {
  const text = String(symptoms || "").toLowerCase();
  const issue = String(possibleIssue || "").toLowerCase();

  if (urgency === "HIGH") {
    if (includesAny(text, ["dibdib", "chest pain", "hirap huminga", "shortness of breath"])) {
      return [
        "Kailan eksaktong nagsimula ang pananakit ng dibdib o hirap sa paghinga?",
        "Lumalala ba ngayon ang sintomas o may kasamang panlalamig/pagpapawis?",
      ];
    }
    return [
      "Kailan nagsimula ang matinding sintomas na ito?",
      "Lumalala ba ang sintomas sa ngayon?",
    ];
  }

  if (issue.includes("gastro") || includesAny(text, ["suka", "pagtatae", "tiyan", "stomach"])) {
    return [
      "Ilang beses ka nang nagsuka o nagtae ngayong araw?",
      "May senyales ba ng dehydration tulad ng tuyong bibig o kaunting ihi?",
    ];
  }

  if (issue.includes("respiratory") || includesAny(text, ["ubo", "lagnat", "lalamunan", "sipon"])) {
    return [
      "Ilang araw mo nang nararanasan ang ubo o lagnat?",
      "May hirap ka ba sa paghinga o pananakit ng dibdib?",
    ];
  }

  if (issue.includes("neuro") || includesAny(text, ["sakit ng ulo", "nahihilo", "pagkahilo"])) {
    return [
      "Gaano katindi ang sakit ng ulo o hilo mula 1 hanggang 10?",
      "May kasabay bang pagsusuka, panlalabo ng paningin, o panghihina?",
    ];
  }

  if (urgency === "MEDIUM") {
    return [
      "Kailan nagsimula ang mga sintomas at lumalala ba ito?",
      "May iba ka pa bang sintomas tulad ng hirap sa paghinga o matinding sakit?",
    ];
  }

  return [
    "Kailan mo unang napansin ang sintomas?",
    "Mas gumagaan ba, pareho lang, o lumalala ang pakiramdam mo?",
  ];
}

function mockTriage(symptoms) {
  const text = symptoms.toLowerCase();
  const matchedSymptoms = extractMatchedSymptoms(symptoms);
  const hasSeverePain = includesAny(text, [
    "severe pain",
    "matinding sakit",
    "worst headache",
    "sobrang sakit",
    "unbearable pain",
  ]);
  const hasHighFever = includesAny(text, ["39", "40", "high fever", "mataas na lagnat", "nilalagnat nang mataas"]);
  const hasPersistentVomiting = includesAny(text, ["persistent vomiting", "paulit ulit na suka", "hindi mapigilan ang suka"]);
  const hasFainting = includesAny(text, ["fainted", "nahimatay", "passed out", "hinimatay"]);
  const hasMediumSignals = includesAny(text, [
    "fever",
    "lagnat",
    "cough",
    "ubo",
    "headache",
    "sakit ng ulo",
    "vomit",
    "suka",
    "diarrhea",
    "pagtatae",
    "dizziness",
    "nahihilo",
    "pagkahilo",
    "sore throat",
    "masakit lalamunan",
    "sipon",
    "trangkaso",
  ]);
  const hasDurationSignals = includesAny(text, ["for 3 days", "for 4 days", "for a week", "ilang araw", "isang linggo", "tatlong araw", "apat na araw"]);
  const hasPediatricOrElderlyRisk = includesAny(text, ["baby", "infant", "elderly", "senior", "matanda"]);
  const symptomCount = matchedSymptoms.length;

  const likelyIssue = includesAny(text, ["cough", "ubo", "sore throat", "lagnat", "fever"])
    ? "Respiratory or infectious symptoms"
    : includesAny(text, ["vomit", "suka", "diarrhea", "pagtatae", "stomach", "tiyan"])
    ? "Gastrointestinal symptoms"
    : includesAny(text, ["headache", "sakit ng ulo", "nahihilo", "dizziness"])
    ? "Neurological symptoms"
    : includesAny(text, ["joint pain", "back pain", "muscle pain", "kalamnan", "likod"])
    ? "Musculoskeletal discomfort"
    : "General symptom report";

  if (hasSeverePain || hasHighFever || hasPersistentVomiting || hasFainting || (hasPediatricOrElderlyRisk && hasMediumSignals)) {
    return {
      urgency: "HIGH",
      summary:
        symptomCount > 0
          ? `Patient reports severe or high-risk symptoms including ${matchedSymptoms.slice(0, 3).join(", ")}.`
          : "Patient reports severe or high-risk symptoms requiring urgent in-clinic review.",
      possible_issue: likelyIssue,
      recommendation: "Book the next available urgent slot today. If symptoms worsen, direct patient to emergency services.",
      confidence: symptomCount > 0 ? 84 : 76,
      missing_info_questions: [
        "Kailan eksaktong nagsimula ang matinding sintomas na ito?",
        "Lumalala ba ngayon ang sintomas mo?",
      ],
    };
  }

  if (hasMediumSignals || hasDurationSignals || symptomCount >= 2) {
    return {
      urgency: "MEDIUM",
      summary:
        symptomCount > 0
          ? `Patient reports moderate symptoms including ${matchedSymptoms.slice(0, 3).join(", ")}.`
          : "Patient reports moderate ongoing symptoms that need priority scheduling.",
      possible_issue: likelyIssue,
      recommendation: "Schedule a priority appointment within 24–48 hours.",
      confidence: symptomCount >= 2 ? 76 : 68,
      missing_info_questions: [
        "Ilang araw mo nang nararanasan ang mga sintomas na ito?",
        "May kasama bang hirap sa paghinga o matinding sakit?",
      ],
    };
  }

  return {
    urgency: "LOW",
    summary:
      symptomCount > 0
        ? `Patient reports mild symptoms including ${matchedSymptoms.slice(0, 2).join(", ")}.`
        : "Patient reports mild non-specific symptoms.",
    possible_issue: likelyIssue,
    recommendation: "Routine appointment within the week is appropriate.",
    confidence: symptomCount > 0 ? 74 : 60,
    missing_info_questions: [
      "Kailan mo unang napansin ang sintomas?",
      "Mas gumagaan ba, pareho lang, o lumalala ang pakiramdam mo?",
    ],
  };
}

async function callGroq(apiKey, model, symptoms) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Patient symptoms: ${symptoms}` },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq error: ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "{}";
}

async function callOpenRouter(apiKey, model, symptoms) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Patient symptoms: ${symptoms}` },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error: ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "{}";
}

async function callTogether(apiKey, model, symptoms) {
  const response = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Patient symptoms: ${symptoms}` },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Together error: ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "{}";
}

async function runLlmAnalysis(symptoms) {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "llama-3.1-8b-instant";

  if (provider === "mock" || !apiKey) {
    return mockTriage(symptoms);
  }

  let rawOutput = "{}";

  if (provider === "groq") {
    rawOutput = await callGroq(apiKey, model, symptoms);
  } else if (provider === "openrouter") {
    rawOutput = await callOpenRouter(apiKey, model, symptoms);
  } else if (provider === "together") {
    rawOutput = await callTogether(apiKey, model, symptoms);
  } else {
    throw new Error("Unsupported LLM provider. Use mock, groq, openrouter, or together.");
  }

  const cleaned = cleanJsonResponse(rawOutput);
  const parsed = JSON.parse(cleaned);
  return normalizeResult(parsed);
}

export async function analyzeSymptomsController(req, res) {
  try {
    const { symptoms, context } = req.body || {};

    if (!symptoms || typeof symptoms !== "string") {
      return res.status(400).json({ error: "symptoms (string) is required" });
    }

    // If a follow-up answer (context) is provided, combine with original symptoms for richer analysis.
    const combinedInput = context
      ? `${symptoms}. Follow-up answer from patient: ${context}`
      : symptoms;

    const emergencyResult = detectEmergencyRedFlags(combinedInput);
    const rawResult = emergencyResult || (await runLlmAnalysis(combinedInput));
    const normalized = normalizeResult(rawResult);

    if (!normalized.urgency_reasons.length) {
      normalized.urgency_reasons = buildUrgencyReasons(combinedInput, normalized.urgency);
    }

    // After a follow-up round, confidence should improve; no further questions needed.
    if (context) {
      normalized.missing_info_questions = [];
    } else if (!normalized.safety_override) {
      normalized.missing_info_questions = buildTagalogFollowUpQuestions(
        combinedInput,
        normalized.urgency,
        normalized.possible_issue
      );
    }

    return res.json(normalized);
  } catch (error) {
    console.error("Triage analysis error:", error);
    return res.status(500).json({ error: "Failed to analyze symptoms" });
  }
}
