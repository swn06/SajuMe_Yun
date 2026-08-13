export async function askGemini(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY가 .env에 없습니다. 개발 서버를 재시작해 주세요.')
  }

  // 2.5 Flash는 신규 키에서 사용 불가 → 공식 대체 모델
  const model = 'gemini-3.6-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const message = data?.error?.message || `API 오류 (${response.status})`
    throw new Error(message)
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')

  if (!text) {
    throw new Error('Gemini 응답에서 텍스트를 찾지 못했습니다.')
  }

  return text
}
