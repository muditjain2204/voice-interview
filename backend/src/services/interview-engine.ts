import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { prisma } from '../prisma/client';
import { interviewStorage } from './interview-storage';
import { getLiveKitUrl, createInterviewSession } from './livekit';

// Initialize AI clients
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

// Interview Engine prompt template
const INTERVIEWER_PROMPT = `
You are a senior technical interviewer conducting a realistic interview.

Your role:
- Ask one question at a time
- Listen carefully to the candidate's response
- Ask relevant follow-up questions based on their answer
- Probe deeper into technical concepts when needed
- Do not reveal correct answers during the interview
- Maintain a professional, encouraging tone
- Support natural interruptions and pauses
- End the interview professionally after the designated time

Context:
- Role: {role}
- Company: {company}
- Level: {level}
- Current Question: {currentQuestion}
- Conversation History: {history}

Rules:
1. Always ask one question at a time
2. Wait for the candidate's response before asking follow-ups
3. Be supportive - this is a learning exercise
4. Probe for specific examples and implementation details
5. Time-box each question (2-3 minutes)
6. End with a polite conclusion message

Response Format:
{
  "response": "Your response text",
  "isFollowUp": true/false,
  "shouldEnd": true/false,
  "nextQuestion": "Next question or null if ending"
}
`;

interface InterviewContext {
  role: string;
  level: string;
  company?: string;
  previousMessages?: { role: string; text: string }[];
}

export interface EngineResponse {
  response: string;
  isFollowUp: boolean;
  shouldEnd: boolean;
  nextQuestion: string | null;
}

export async function generateInterviewGreetingAndQuestion(
  context: InterviewContext & { interviewId?: string }
): Promise<{
  greeting: string;
  firstQuestion: string;
  livekitUrl: string;
  livekitToken: string;
  interviewId?: string;
  status?: string;
}> {
  const { role, level, company, interviewId } = context;

  // Fetch relevant question from database
  let question = await prisma.question.findFirst({
    where: {
      role: role as any,
      level: level as any,
    },
    orderBy: { difficulty: 'asc' },
  });

  // If no question found, use a default one
  if (!question) {
    question = getDefaultQuestion(role, level);
  }

  // Generate greeting
  const greeting = `Hello and welcome to your ${getRoleDisplayName(role)} interview at ${getCompanyDisplayName(company) || 'a top tech company'}.

I'm your AI interviewer, and I'll be guiding you through this interview. You'll be asked ${getDifficultyText(level)} technical questions about your role.

The interview will be conducted entirely through voice - I'll speak to you, and you can respond through your microphone.

Let's get started!`;

  const firstQuestion = question?.text || getDefaultQuestionText(role, level);

  // Generate LiveKit session if interviewId provided
  let livekitUrl = '';
  let livekitToken = '';

  if (interviewId) {
    try {
      const session = await createInterviewSession(
        interviewId,
        `Interviewee_${interviewId}`
      );
      livekitUrl = session.url;
      livekitToken = session.token;
    } catch (error) {
      logger.error('Failed to create LiveKit session:', error);
    }
  }

  const result: any = {
    greeting,
    firstQuestion,
    livekitUrl,
    livekitToken,
  };

  if (interviewId) {
    result.interviewId = interviewId;
    result.status = 'in_progress';
  }

  return result;
}

export async function processInterviewMessage(
  interviewId: string,
  candidateResponse: string,
  transcriptHistory: { role: string; text: string }[]
): Promise<EngineResponse> {
  // Get the current interview context
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
  });

  if (!interview) {
    throw new Error('Interview not found');
  }

  // Build conversation context
  const history = transcriptHistory
    .map((msg) => `- ${msg.role}: ${msg.text}`)
    .join('\n');

  const prompt = INTERVIEWER_PROMPT.replace('{role}', interview.role)
    .replace('{company}', interview.company || 'Tech Company')
    .replace('{level}', interview.level)
    .replace('{currentQuestion}', candidateResponse || 'Begin answering')
    .replace('{history}', history || 'No previous conversation');

  // Try OpenAI first (primary)
  try {
    const response = await processWithOpenAI(prompt, candidateResponse);
    return response;
  } catch (error) {
    logger.warn('OpenAI processing failed, trying Anthropic:', error);
  }

  // Fallback to Anthropic
  try {
    const response = await processWithAnthropic(prompt, candidateResponse);
    return response;
  } catch (error) {
    logger.error('Both AI providers failed:', error);
  }

  // Fallback to rule-based response
  return getFallbackResponse(candidateResponse, transcriptHistory);
}

async function processWithOpenAI(
  prompt: string,
  candidateResponse: string
): Promise<EngineResponse> {
  const messages = [
    {
      role: 'system' as const,
      content: prompt,
    },
    {
      role: 'user' as const,
      content: `Candidate said: "${candidateResponse}"`,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: config.openai.model || 'gpt-4o',
    messages,
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  return {
    response: parsed.response || parsed.text || getNextQuestionPrompt(candidateResponse),
    isFollowUp: parsed.isFollowUp ?? true,
    shouldEnd: parsed.shouldEnd ?? false,
    nextQuestion: parsed.nextQuestion || null,
  };
}

async function processWithAnthropic(
  prompt: string,
  candidateResponse: string
): Promise<EngineResponse> {
  const messages = [
    {
      role: 'user' as const,
      content: `${prompt}\n\nCandidate said: "${candidateResponse}"`,
    },
  ];

  const response = await anthropic.messages.create({
    model: config.anthropic.model || 'claude-sonnet-4-20250514',
    messages,
    max_tokens: 500,
    temperature: 0.7,
    system: 'Respond in JSON format',
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  const content = textBlock && 'text' in textBlock ? textBlock.text : '{}';
  const parsed = JSON.parse(content);

  return {
    response: parsed.response || parsed.text || getNextQuestionPrompt(candidateResponse),
    isFollowUp: parsed.isFollowUp ?? true,
    shouldEnd: parsed.shouldEnd ?? false,
    nextQuestion: parsed.nextQuestion || null,
  };
}

function getNextQuestionPrompt(candidateResponse: string): string {
  // Simple rule-based fallback
  return `Interesting point about "${candidateResponse}". Let me ask you a follow-up question. Can you elaborate on how you would approach this problem?`;
}

function getFallbackResponse(
  candidateResponse: string,
  _history: { role: string; text: string }[]
): EngineResponse {
  const responses = [
    `I'd like to understand more about your approach. Can you walk me through your thought process?`,
    `That's a good point. What are some potential edge cases we should consider?`,
    `Can you provide a specific example of how you've implemented this in a real project?`,
    `Let me ask you a follow-up: what would change if the requirements were slightly different?`,
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  return {
    response: randomResponse,
    isFollowUp: true,
    shouldEnd: false,
    nextQuestion: null,
  };
}

// Helper functions
function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    frontend_developer: 'Frontend Developer',
    backend_developer: 'Backend Developer',
    react_native_developer: 'React Native Developer',
    node_js_developer: 'Node.js Developer',
    data_structures_algorithms: 'Data Structures & Algorithms',
    system_design: 'System Design',
    hr_round: 'HR Round',
    ai_engineer: 'AI Engineer',
    data_analyst: 'Data Analyst',
    data_scientist: 'Data Scientist',
    product_manager: 'Product Manager',
    consultant: 'Consultant',
    tax_analyst: 'Tax Analyst',
    forward_deploy_engineer: 'Forward Deploy Engineer',
    software_engineer: 'Software Engineer',
  };
  return roleMap[role] || 'Software Engineer';
}

function getCompanyDisplayName(company?: string): string {
  if (!company) return 'a tech company';
  const companyMap: Record<string, string> = {
    google: 'Google',
    meta: 'Meta',
    amazon: 'Amazon',
    microsoft: 'Microsoft',
    apple: 'Apple',
    netflix: 'Netflix',
    uber: 'Uber',
    airbnb: 'Airbnb',
    stripe: 'Stripe',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    databricks: 'Databricks',
    snowflake: 'Snowflake',
    deloitte: 'Deloitte',
    pwc: 'PwC',
    mckinsey: 'McKinsey',
    goldman_sachs: 'Goldman Sachs',
    jpmorgan: 'JPMorgan',
  };
  return companyMap[company] || company;
}

function getDifficultyText(level: string): string {
  const map: Record<string, string> = {
    easy: 'a basic interview',
    medium: 'an intermediate interview',
    hard: 'a challenging interview',
  };
  return map[level] || 'an interview';
}

function getDefaultQuestion(role: string, level: string): any {
  const defaultQuestions: Record<string, any> = {
    'software_engineer': {
      id: 'default_se',
      role: 'software_engineer',
      level: level as any,
      topic: 'coding',
      text: 'Explain the difference between REST and GraphQL APIs.',
      difficulty: 5,
    },
    'frontend_developer': {
      id: 'default_fe',
      role: 'frontend_developer',
      level: level as any,
      topic: 'react',
      text: 'How would you optimize the performance of a React application?',
      difficulty: 5,
    },
    'backend_developer': {
      id: 'default_be',
      role: 'backend_developer',
      level: level as any,
      topic: 'database',
      text: 'Explain the difference between SQL and NoSQL databases.',
      difficulty: 4,
    },
  };

  return defaultQuestions[role] || defaultQuestions['software_engineer'];
}

function getDefaultQuestionText(role: string, level: string): string {
  switch (role) {
    case 'frontend_developer':
      return 'How would you optimize the performance of a React application?';
    case 'backend_developer':
      return 'Can you explain the difference between SQL and NoSQL databases?';
    case 'system_design':
      return 'Design a URL shortener system. What are the key components?';
    case 'data_structures_algorithms':
      return 'Walk me through the time and space complexity of a binary search tree.';
    default:
      return 'Tell me about a challenging technical problem you solved recently.';
  }
}