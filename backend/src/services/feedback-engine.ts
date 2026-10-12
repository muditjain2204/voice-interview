import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { IFeedback, IInterviewMessage, IProctoringData } from '../types';

// Initialize AI clients
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

const FEEDBACK_PROMPT = `
You are an expert interview evaluator. Analyze the following interview transcript and provide structured feedback.

Evaluate the candidate on:
1. Communication skills (clarity, articulation, structure)
2. Technical accuracy (correctness of technical answers)
3. Problem solving (approach, logical thinking, edge cases)
4. Confidence (conviction in answers, handling pressure)

Provide:
- Scores from 0-10 for each category
- An overall score (0-100)
- 3-5 specific strengths
- 3-5 specific weaknesses
- 3-5 actionable recommendations
- List of missed concepts
- Strong points demonstrated
- Improvement suggestions
- A detailed analysis (3-5 paragraphs)

Return ONLY valid JSON in this format:
{
  "communication": 8,
  "technicalAccuracy": 7,
  "problemSolving": 6,
  "confidence": 8,
  "overallScore": 74,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["rec 1", "rec 2"],
  "missedConcepts": ["concept 1", "concept 2"],
  "strongPoints": ["point 1", "point 2"],
  "improvementSuggestions": ["suggestion 1", "suggestion 2"],
  "detailedAnalysis": "Full analysis text here"
}
`;

export async function generateFeedback(
  transcript: IInterviewMessage[],
  proctoringData?: IProctoringData,
  role?: string,
  level?: string
): Promise<IFeedback> {
  // Build transcript text
  const transcriptText = transcript
    .map((msg) => `[${msg.role.toUpperCase()}]: ${msg.text}`)
    .join('\n\n');

  // Apply proctoring deductions
  const proctoringDeduction = proctoringData?.pointDeduction || 0;

  // Try OpenAI first
  try {
    const feedback = await generateWithOpenAI(transcriptText, role, level, proctoringDeduction);
    return feedback;
  } catch (error) {
    logger.warn('OpenAI feedback generation failed, trying Anthropic:', error);
  }

  // Try Anthropic
  try {
    const feedback = await generateWithAnthropic(transcriptText, role, level, proctoringDeduction);
    return feedback;
  } catch (error) {
    logger.error('Both AI providers failed for feedback:', error);
  }

  // Fallback to rule-based feedback
  return generateFallbackFeedback(transcript, proctoringDeduction);
}

async function generateWithOpenAI(
  transcriptText: string,
  role?: string,
  level?: string,
  proctoringDeduction: number = 0
): Promise<IFeedback> {
  const messages = [
    {
      role: 'system' as const,
      content: FEEDBACK_PROMPT,
    },
    {
      role: 'user' as const,
      content: `Role: ${role || 'Software Engineer'}\nLevel: ${level || 'medium'}\n\nTranscript:\n${transcriptText}\n\nProctoring Issues: ${proctoringDeduction} points deducted\n\nProvide your feedback in the exact JSON format specified.`,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: config.openai.model || 'gpt-4o',
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  return parseFeedback(parsed, proctoringDeduction);
}

async function generateWithAnthropic(
  transcriptText: string,
  role?: string,
  level?: string,
  proctoringDeduction: number = 0
): Promise<IFeedback> {
  const response = await anthropic.messages.create({
    model: config.anthropic.model || 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    temperature: 0.3,
    system: FEEDBACK_PROMPT,
    messages: [
      {
        role: 'user' as const,
        content: `Role: ${role || 'Software Engineer'}\nLevel: ${level || 'medium'}\n\nTranscript:\n${transcriptText}\n\nProctoring Issues: ${proctoringDeduction} points deducted\n\nProvide your feedback in the exact JSON format specified.`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  const content = textBlock && 'text' in textBlock ? textBlock.text : '{}';
  const parsed = JSON.parse(content);

  return parseFeedback(parsed, proctoringDeduction);
}

function parseFeedback(parsed: any, proctoringDeduction: number): IFeedback {
  const baseScore = parsed.overallScore || 70;
  const adjustedScore = Math.max(0, baseScore - proctoringDeduction);

  return {
    communication: clampScore(parsed.communication),
    technicalAccuracy: clampScore(parsed.technicalAccuracy),
    problemSolving: clampScore(parsed.problemSolving),
    confidence: clampScore(parsed.confidence),
    overallScore: adjustedScore,
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    recommendations: parsed.recommendations || [],
    missedConcepts: parsed.missedConcepts || [],
    strongPoints: parsed.strongPoints || parsed.strengths || [],
    improvementSuggestions: parsed.improvementSuggestions || parsed.recommendations || [],
    detailedAnalysis: parsed.detailedAnalysis || 'Detailed analysis not available.',
  };
}

function clampScore(score: any): number {
  const num = Number(score);
  if (isNaN(num)) return 5;
  return Math.max(0, Math.min(10, num));
}

function generateFallbackFeedback(
  transcript: IInterviewMessage[],
  proctoringDeduction: number
): IFeedback {
  const candidateMessages = transcript.filter((m) => m.role === 'candidate');
  const totalWords = candidateMessages.reduce(
    (sum, msg) => sum + msg.text.split(' ').length,
    0
  );
  const avgWordsPerResponse = candidateMessages.length > 0
    ? totalWords / candidateMessages.length
    : 0;

  // Estimate scores based on response length and content
  const communicationScore = avgWordsPerResponse > 20 ? 7 : avgWordsPerResponse > 10 ? 5 : 3;
  const technicalScore = avgWordsPerResponse > 30 ? 7 : avgWordsPerResponse > 15 ? 5 : 3;
  const problemSolvingScore = avgWordsPerResponse > 25 ? 6 : 4;
  const confidenceScore = avgWordsPerResponse > 20 ? 6 : 4;

  const overallScore = Math.max(
    0,
    Math.round((communicationScore + technicalScore + problemSolvingScore + confidenceScore) * 2.5) - proctoringDeduction
  );

  return {
    communication: communicationScore,
    technicalAccuracy: technicalScore,
    problemSolving: problemSolvingScore,
    confidence: confidenceScore,
    overallScore,
    strengths: [
      'Engaged with the interview',
      'Showed interest in the role',
    ],
    weaknesses: [
      'Responses could be more detailed',
      'Consider providing more specific examples',
    ],
    recommendations: [
      'Practice with mock interviews to improve fluency',
      'Study core concepts in your target role',
      'Prepare specific examples from past projects',
    ],
    missedConcepts: ['Specific technical details could not be assessed'],
    strongPoints: ['Willingness to engage with the process'],
    improvementSuggestions: [
      'Provide more detailed technical explanations',
      'Use the STAR method for behavioral questions',
      'Practice articulating complex ideas clearly',
    ],
    detailedAnalysis: `Based on the interview transcript, the candidate provided responses that showed engagement with the questions asked. The response patterns suggest areas for further development in technical depth and communication clarity. With continued practice and focused preparation on the role-specific concepts, the candidate can improve their interview performance significantly.`,
  };
}