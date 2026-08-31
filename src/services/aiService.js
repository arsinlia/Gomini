export const PROVIDERS = {
  OPENROUTER: {
    id: 'OPENROUTER',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'google/gemini-2.5-flash',
    type: 'openai_compatible',
  },
  ANYROUTER: {
    id: 'ANYROUTER',
    name: 'AnyRouter / Custom',
    baseUrl: 'https://api.anyrouter.top/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    type: 'openai_compatible',
  },
  OPENAI: {
    id: 'OPENAI',
    name: 'OpenAI Direct',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    type: 'openai_compatible',
  },
  GEMINI_DIRECT: {
    id: 'GEMINI_DIRECT',
    name: 'Google Gemini Direct',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.5-flash',
    type: 'gemini_native',
  },
};

export const sendMessageToAI = async ({
  messages,
  apiKey,
  providerId,
  customBaseUrl,
  modelName,
  systemPrompt,
}) => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('لطفاً ابتدا کلید API را در بخش تنظیمات وارد کنید.');
  }

  const provider = PROVIDERS[providerId] || PROVIDERS.OPENROUTER;
  const activeModel = modelName?.trim() || provider.defaultModel;

  if (provider.type === 'gemini_native') {
    const endpoint = `${provider.baseUrl}/${activeModel}:generateContent?key=${apiKey.trim()}`;
    
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const body = {
      contents,
      ...(systemPrompt?.trim() && {
        systemInstruction: { parts: [{ text: systemPrompt.trim() }] },
      }),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || 'خطا در ارتباط با سرور گوگل جمینای');
    }

    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'بدون پاسخ دریافت شد.';
  }

  // پروتکل سازگار با OpenAI (شامل OpenRouter، AnyRouter و سایر سرویس‌ها)
  const endpoint = customBaseUrl?.trim() || provider.baseUrl;
  const formattedMessages = [];

  if (systemPrompt?.trim()) {
    formattedMessages.push({ role: 'system', content: systemPrompt.trim() });
  }

  messages.forEach((msg) => {
    formattedMessages.push({ role: msg.role, content: msg.content });
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey.trim()}`,
  };

  if (providerId === 'OPENROUTER') {
    headers['HTTP-Referer'] = 'https://github.com/gomini-app';
    headers['X-Title'] = 'Gomini App';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: activeModel,
      messages: formattedMessages,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || 'خطا در دریافت پاسخ از مدل');
  }

  return data?.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.';
};
