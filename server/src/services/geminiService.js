import dotenv from 'dotenv';
dotenv.config();

const DISCLAIMER_TEXT =
  'Care Connect does not provide medical diagnosis or treatment. Specialty suggestions are for healthcare navigation only. If you are experiencing a medical emergency, contact local emergency services or visit the nearest emergency department.';

// Emergency Triage Red Flags
const EMERGENCY_KEYWORDS = [
  'chest pain',
  'crushing chest',
  'heart attack',
  'difficulty breathing',
  'cannot breathe',
  "can't breathe",
  'severe shortness of breath',
  'sudden numbness',
  'facial drooping',
  'slurred speech',
  'paralysis',
  'heavy bleeding',
  'uncontrollable bleeding',
  'coughing blood',
  'vomiting blood',
  'passed out',
  'unconscious',
  'seizure',
  'convulsion',
  'anaphylaxis',
  'throat swelling',
  'swollen tongue',
  'severe overdose',
  'suicide',
  'poisoning'
];

// High-accuracy fallback classification rules for healthcare navigation
const SPECIALTY_RULES = [
  {
    specialty: 'Dermatology',
    keywords: [
      'skin', 'rash', 'itching', 'itch', 'itchy', 'acne', 'pimple', 'eczema',
      'psoriasis', 'hives', 'urticaria', 'mole', 'dermatitis', 'fungal', 'scalp',
      'blister', 'red spots', 'skin allergy', 'peeling', 'dry patch', 'hair fall'
    ],
    explanation: 'Symptoms involving skin irritation, itching, or rashes are best evaluated by a Dermatologist for proper clinical skin assessment.'
  },
  {
    specialty: 'Dentistry',
    keywords: [
      'tooth', 'teeth', 'dental', 'gum', 'gums', 'cavity', 'wisdom tooth',
      'toothache', 'jaw pain', 'bleeding gum', 'molar', 'root canal', 'dentist',
      'filling', 'enamel', 'bad breath'
    ],
    explanation: 'Dental discomfort, toothache, and gum issues should be examined by a Dental Specialist (Dentist / Endodontist).'
  },
  {
    specialty: 'Orthopedics',
    keywords: [
      'bone', 'joint', 'knee', 'knee pain', 'fracture', 'sprain', 'back pain',
      'backache', 'sciatica', 'shoulder', 'elbow', 'ankle', 'spine', 'ligament',
      'arthritis', 'swollen knee', 'twist', 'tendon', 'posture'
    ],
    explanation: 'Musculoskeletal, joint, ligament, and bone pain are evaluated by an Orthopedic Specialist.'
  },
  {
    specialty: 'Pediatrics',
    keywords: [
      'child', 'baby', 'toddler', 'infant', 'kid', 'newborn', 'vaccine',
      'pediatric', 'my son', 'my daughter', 'child fever', 'growth'
    ],
    explanation: 'Concerns regarding infant, toddler, or child health and vaccinations are managed by a Pediatrician.'
  },
  {
    specialty: 'Cardiology',
    keywords: [
      'heart', 'palpitation', 'palpitations', 'irregular heart', 'blood pressure',
      'hypertension', 'cholesterol', 'cardiac', 'ecg', 'lipid', 'pulse'
    ],
    explanation: 'Non-emergency cardiovascular concerns and blood pressure evaluations are guided to a Cardiologist.'
  },
  {
    specialty: 'ENT',
    keywords: [
      'ear', 'nose', 'throat', 'sinus', 'sinusitis', 'ear pain', 'earache',
      'tonsil', 'tonsillitis', 'hearing', 'vertigo', 'voice', 'hoarse', 'nasal',
      'phlegm', 'ear discharge', 'earwax'
    ],
    explanation: 'Ear, nose, sinus, or throat conditions are best reviewed by an ENT Specialist (Otorhinolaryngologist).'
  },
  {
    specialty: 'Gynecology',
    keywords: [
      'period', 'menstrual', 'menstruation', 'pcos', 'pregnancy', 'pregnant',
      'pelvic', 'vaginal', 'cramps', 'contraception', 'ovary', 'uterus',
      'gynecologist', 'irregular cycle'
    ],
    explanation: 'Reproductive health, menstrual irregularities, and pregnancy checkups are guided to a Gynecologist & Obstetrician.'
  },
  {
    specialty: 'General Physician',
    keywords: [
      'fever', 'cold', 'cough', 'flu', 'headache', 'weakness', 'fatigue',
      'tired', 'stomach', 'digestion', 'vomiting', 'nausea', 'diarrhea',
      'body ache', 'chills', 'malaise', 'checkup', 'general', 'dizzy'
    ],
    explanation: 'General constitutional symptoms like seasonal viral fever, fatigue, or common cold are best initially addressed by a General Physician.'
  }
];

export async function classifySpecialty(userPrompt) {
  const normalized = (userPrompt || '').trim().toLowerCase();

  if (!normalized) {
    return {
      specialty: 'General Physician',
      confidence: 0.7,
      reasoning: 'Please describe your concern in detail. A General Physician is recommended for primary evaluation.',
      isEmergency: false,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // Check for immediate emergency red flags
  const isEmergency = EMERGENCY_KEYWORDS.some((kw) => normalized.includes(kw));
  if (isEmergency) {
    return {
      specialty: 'Emergency Department / Urgent Care',
      isEmergency: true,
      confidence: 0.99,
      warning:
        'This may require urgent medical attention. If you believe this is an emergency, seek immediate medical care or contact local emergency services.',
      reasoning:
        'Your description contains symptoms that could indicate a life-threatening or urgent medical emergency. Please visit the nearest Emergency Room or call emergency services immediately.',
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // Attempt Gemini API call if key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 5) {
    try {
      const response = await callGeminiAPI(apiKey, userPrompt);
      if (response && response.specialty) {
        return {
          ...response,
          isEmergency: false,
          disclaimer: DISCLAIMER_TEXT
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to smart rule engine:', err.message);
    }
  }

  // High-accuracy fallback engine
  return fallbackClassification(normalized);
}

async function callGeminiAPI(apiKey, userPrompt) {
  const prompt = `You are a medical healthcare navigation assistant. You DO NOT diagnose diseases or prescribe medication.
Your role is strictly to help a patient identify which medical specialty they should visit based on their described concern.

Valid specialties:
- Dermatology
- General Physician
- Dentistry
- Orthopedics
- Pediatrics
- Cardiology
- ENT
- Gynecology

Patient Concern: "${userPrompt}"

Respond with ONLY a raw JSON object with this exact schema:
{
  "specialty": "<one of the valid specialties above>",
  "confidence": <number between 0.0 and 1.0>,
  "reasoning": "<1-2 sentence non-diagnostic explanation of why this specialty is appropriate for navigation>",
  "isEmergency": false
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini API HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  const parsed = JSON.parse(text);
  return parsed;
}

function fallbackClassification(normalized) {
  let matchedSpecialty = null;
  let maxMatches = 0;
  let explanation = '';

  for (const rule of SPECIALTY_RULES) {
    let matches = 0;
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        matches += 1;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      matchedSpecialty = rule.specialty;
      explanation = rule.explanation;
    }
  }

  if (!matchedSpecialty) {
    matchedSpecialty = 'General Physician';
    explanation = 'A General Physician can provide primary care examination and guide you to specialized care if needed.';
  }

  return {
    specialty: matchedSpecialty,
    confidence: maxMatches > 0 ? 0.95 : 0.75,
    reasoning: explanation,
    isEmergency: false,
    disclaimer: DISCLAIMER_TEXT
  };
}
