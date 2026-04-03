import type { FunctionDeclaration, Tool } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';

export const ORCHESTRATOR_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'web_search',
        description:
          'Search the web for current, real-time information. Use this to find: hotel names and phone numbers, current prices, business hours, addresses, reviews, or any factual data needed for the task. Always search before making phone calls to get verified phone numbers.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: 'Specific, targeted search query. Be precise for best results.',
            },
            num_results: {
              type: SchemaType.NUMBER,
              description: 'Number of results to return. Default: 5. Max: 10.',
            },
          },
          required: ['query'],
        },
      } satisfies FunctionDeclaration,

      {
        name: 'make_phone_call',
        description:
          'Initiate an AI-powered phone call to a business. The AI voice agent will conduct the conversation autonomously based on the objective. Use this ONLY when you have a verified phone number from web_search. Always call before booking.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            phone_number: {
              type: SchemaType.STRING,
              description: 'E.164 format phone number (e.g., +12125551234). Must be verified from search.',
            },
            business_name: {
              type: SchemaType.STRING,
              description: 'Full name of the business being called.',
            },
            objective: {
              type: SchemaType.STRING,
              description:
                'What the AI agent must accomplish. Be specific: "Ask about double room availability April 10-12, 2 guests, and negotiate for under $200/night."',
            },
            context: {
              type: SchemaType.STRING,
              description: 'Background context for the AI agent: user preferences, constraints, previous call history.',
            },
          },
          required: ['phone_number', 'business_name', 'objective'],
        },
      } satisfies FunctionDeclaration,

      {
        name: 'request_user_approval',
        description:
          'Pause the agent and present findings to the user for a decision. Use when: you have concrete options ready, before making any commitment, or when user input is required. The agent will be suspended until the user responds.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            summary: {
              type: SchemaType.STRING,
              description: 'Clear summary of what was discovered and what decision is needed.',
            },
            options: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  label: { type: SchemaType.STRING, description: 'Short option label' },
                  details: { type: SchemaType.STRING, description: 'Full details of this option' },
                  price: { type: SchemaType.STRING, description: 'Cost if applicable' },
                  recommended: { type: SchemaType.BOOLEAN, description: 'Whether this is recommended' },
                },
              },
              description: 'Array of 2-4 mutually exclusive options for the user.',
            },
          },
          required: ['summary', 'options'],
        },
      } satisfies FunctionDeclaration,

      {
        name: 'send_notification',
        description:
          'Send an informational update, progress report, or final result to the user thread. Use for status updates during long operations.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            message: {
              type: SchemaType.STRING,
              description: 'The message content. Use markdown for formatting when helpful.',
            },
            type: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['info', 'success', 'error', 'waiting'],
              description: 'Message type affects how it is displayed in the UI.',
            },
          },
          required: ['message', 'type'],
        },
      } satisfies FunctionDeclaration,
    ],
  },
];

export const ORCHESTRATOR_SYSTEM_PROMPT = `You are byte, a personal AI agent with the ability to search the web and make phone calls on behalf of the user.

CAPABILITIES:
- web_search: Find current information, business contacts, prices
- make_phone_call: Call businesses and conduct negotiations via AI voice
- request_user_approval: Pause and get user decisions before committing
- send_notification: Keep the user informed of your progress

OPERATING PRINCIPLES:
1. Always search before calling — you need a verified phone number from search results
2. Always get approval before any booking, purchase, or commitment
3. Report progress regularly using send_notification
4. Be thorough — call multiple places if the first doesn't meet requirements
5. If a tool fails, explain why and try an alternative approach
6. Never hallucinate phone numbers — only call numbers found via web_search

RESPONSE FORMAT:
- Use tools to accomplish the task step by step
- After all tools complete, provide a clear final summary
- Keep updates concise and actionable`;
