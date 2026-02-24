const express = require('express');
const fetch = require('node-fetch');

// Basic Express application to serve the Misbah+ AI form and proxy
// suggestions through the Google Gemini API. This server exposes one
// endpoint, POST /suggest-field, which accepts details about the
// requested field and returns a set of suggestions. To function
// properly it requires a Google API key set on the environment
// variable GOOGLE_API_KEY. If no key is provided the server returns
// a fallback response containing simple placeholder suggestions.

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Read the API key from the environment. Users should set this
// variable to their own API key. The server never logs or stores
// the key.
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

/**
 * Build a prompt for Gemini based on the provided parameters. The
 * prompt asks the model to generate a short list of candidate values
 * for a specific form field given the module and desired outcome.
 *
 * @param {string} moduleName
 * @param {string} desiredOutcome
 * @param {string} fieldId
 * @param {string} knownInfo
 * @param {string} constraints
 * @param {string} language
 */
function buildPrompt(moduleName, desiredOutcome, fieldId, knownInfo = '', constraints = '', language = 'ar') {
  return [
    `أنت مساعد محترف لملء حقول نموذج Misbah+.`,
    `مهمة المستخدم هي إعداد ${moduleName} للحصول على ${desiredOutcome}.`,
    `الرجاء اقتراح 5 قيم محتملة لخانة «${fieldId}» في النموذج.`,
    knownInfo ? `معلومات إضافية:
${knownInfo}` : '',
    constraints ? `قيود إضافية:
${constraints}` : '',
    `أجب باللغة ${language} فقط.`,
    `لا تقدم أي أمثلة توضيحية. استعمل عبارات قصيرة واضحة.`,
    `أعد الاقتراحات كسطر واحد لكل قيمة. لا تبدأ بأي تعداد.`
  ].filter(Boolean).join('\n\n');
}

/**
 * Call the Gemini API to generate suggestions. This function
 * encapsulates the API call and parsing of the response. If no
 * API key is set or an error occurs, a fallback list of suggestions
 * is returned.
 *
 * @param {Object} params
 * @param {string} params.moduleName
 * @param {string} params.desiredOutcome
 * @param {string} params.fieldId
 * @param {string} params.knownInfo
 * @param {string} params.constraints
 * @param {string} params.language
 */
async function generateSuggestions({ moduleName, desiredOutcome, fieldId, knownInfo, constraints, language }) {
  // If no API key is configured return a simple default.
  if (!GOOGLE_API_KEY) {
    return {
      suggestions: [`قيمة 1 لـ ${fieldId}`, `قيمة 2 لـ ${fieldId}`, `قيمة 3 لـ ${fieldId}`],
      best: `قيمة 1 لـ ${fieldId}`,
      notes: 'لم يتم توفير مفتاح API؛ هذه اقتراحات افتراضية.'
    };
  }

  const prompt = buildPrompt(moduleName, desiredOutcome, fieldId, knownInfo, constraints, language);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${encodeURIComponent(GOOGLE_API_KEY)}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.6,
      topP: 0.8,
      maxOutputTokens: 150
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const json = await response.json();
    // The response structure has a candidates array with content.parts
    const firstCandidate = json.candidates && json.candidates[0];
    if (!firstCandidate || !firstCandidate.content || !firstCandidate.content.parts) {
      throw new Error('Invalid response from Gemini API');
    }
    const text = firstCandidate.content.parts.map(p => p.text).join(' ');
    // Split lines and trim. Remove empty lines.
    const lines = text.split(/\n|\r/).map(s => s.trim()).filter(Boolean);
    // Use up to the first 5 suggestions.
    const suggestions = lines.slice(0, 5);
    return {
      suggestions,
      best: suggestions[0] || '',
      notes: ''
    };
  } catch (err) {
    console.error('Error calling Gemini API:', err);
    return {
      suggestions: [`قيمة 1 لـ ${fieldId}`, `قيمة 2 لـ ${fieldId}`, `قيمة 3 لـ ${fieldId}`],
      best: `قيمة 1 لـ ${fieldId}`,
      notes: 'حدث خطأ عند الاتصال بواجهة Gemini؛ هذه اقتراحات افتراضية.'
    };
  }
}

// Endpoint to handle suggestion requests
app.post('/suggest-field', async (req, res) => {
  const { moduleName, desiredOutcome, fieldId, knownInfo, constraints, language } = req.body;
  if (!moduleName || !desiredOutcome || !fieldId) {
    return res.status(400).json({ error: 'Missing required fields: moduleName, desiredOutcome, fieldId' });
  }
  const result = await generateSuggestions({ moduleName, desiredOutcome, fieldId, knownInfo, constraints, language });
  res.json(result);
});

// Start the server. Use PORT environment variable if provided.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Misbah+ AI server running on port ${PORT}`);
});