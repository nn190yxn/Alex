import dotenv from 'dotenv'
dotenv.config()

const API_KEY = process.env.MCAI_LLM_API_KEY || process.env.OPENAI_API_KEY
const BASE_URL = process.env.MCAI_LLM_BASE_URL || 'https://proxy.monkeycode-ai.com/v1'
const DEFAULT_MODEL = process.env.MCAI_LLM_MODEL || 'minimax-m2.7'

async function createChatCompletion({
  messages,
  model = DEFAULT_MODEL,
  temperature = 0.8,
  max_tokens = 2000
}) {
  if (!API_KEY) {
    throw new Error('AI API key not configured')
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function generateText(prompt, { temperature = 0.8, max_tokens = 2000 } = {}) {
  return createChatCompletion({
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens
  })
}

async function generateStructured({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  max_tokens = 3000
}) {
  return createChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature,
    max_tokens
  })
}

export { createChatCompletion, generateText, generateStructured, DEFAULT_MODEL }
