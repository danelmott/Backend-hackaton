import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from '../prompts/buildSystemPrompt.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function askClaude(message, modo = 'CLIENTE') {
  try {
    const systemPrompt = buildSystemPrompt(modo)
    
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',

      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    })
    return response.content[0].text
  } 
  catch (error) {
    console.log(error)
    throw error
  }
}