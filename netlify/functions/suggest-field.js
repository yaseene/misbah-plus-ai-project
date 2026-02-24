const fetch = require('node-fetch');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

function buildPrompt(moduleName, desiredOutcome, fieldId, knownInfo = '', constraints = '', language = 'ar') {
  return [
    `أنت مساعد محترف لملء حقول نموذج Misbah+.`,
    `مهمة المستخدم هي إعداد ${moduleName} للحصول على ${desiredOutcome}.`,
    `الرجاء اقتراح 5 قيم محتملة لخانة «${fieldId}» في النموذج.`,
    knownInfo ? `معلومات إضافية:\n${knownInfo}` : '',
    constraints ? `قيود إضافية:\n${constraints}` : '',
    `أجب باللغة ${language} فقط.`,
    `لا تقدم أي أمثلة توضيحية. استعمل عبارات قصيرة واضحة.`,
    `أعد الاقتراحات كسطر واحد لكل قيمة. لا تبدأ بأي تعداد.`
  ].filter(Boolean).join('\n\n');
}

async function generateSuggestions({ moduleName, desiredOutcome, fieldId, knownInfo, constraints, language }) {
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
    const firstCandidate = json.candidates && json.candidates[0];
    if (!firstCandidate || !firstCandidate.content || !firstCandidate.content.parts) {
      throw new Error('Invalid response from Gemini API');
    }
    const text = firstCandidate.content.parts.map(p => p.text).join(' ');
    const lines = text.split(/\n|\r/).map(s => s.trim()).filter(Boolean);
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

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }
  const { moduleName, desiredOutcome, fieldId, knownInfo, constraints, language } = body;
  if (!moduleName || !desiredOutcome || !fieldId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: moduleName, desiredOutcome, fieldId' })
    };
  }
  const result = await generateSuggestions({ moduleName, desiredOutcome, fieldId, knownInfo, constraints, language });
  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: { 'Content-Type': 'application/json' }
  };
};
