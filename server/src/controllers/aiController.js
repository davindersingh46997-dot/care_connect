import { classifySpecialty } from '../services/geminiService.js';

export async function handleSpecialtyClassification(req, res) {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Please provide a valid prompt describing your health concern.'
      });
    }

    const result = await classifySpecialty(prompt);
    return res.json(result);
  } catch (err) {
    console.error('Error in AI specialty classification:', err);
    return res.status(500).json({
      error: 'An error occurred during specialty classification.',
      specialty: 'General Physician',
      disclaimer:
        'Care Connect does not provide medical diagnosis or treatment. Specialty suggestions are for healthcare navigation only.'
    });
  }
}
