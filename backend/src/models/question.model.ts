/**
 * Question Model for Voice AI Interview Platform
 * Manages interview question bank, adaptive selection, keyword extraction, and follow-up probes.
 */

import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import type { UserRole, InterviewLevel, Company } from '../types';
import type { IAdaptiveQuestion } from './voice.types';

export class QuestionModel {
  /**
   * Find questions matching target role and difficulty level
   */
  static async findByRoleAndLevel(
    role: UserRole,
    level: InterviewLevel,
    topic?: string
  ): Promise<IAdaptiveQuestion[]> {
    try {
      const whereClause: any = {
        role: role as any,
        level: level as any,
      };

      if (topic) {
        whereClause.topic = topic;
      }

      const questions = await prisma.question.findMany({
        where: whereClause,
        orderBy: { difficulty: 'asc' },
      });

      return questions.map((q) => this.toAdaptiveQuestion(q));
    } catch (error) {
      logger.error(`QuestionModel.findByRoleAndLevel failed:`, error);
      return [this.getDefaultFallbackQuestion(role, level)];
    }
  }

  /**
   * Pick the best initial question for starting a voice interview
   */
  static async getOpeningQuestion(
    role: UserRole,
    level: InterviewLevel,
    company?: Company
  ): Promise<IAdaptiveQuestion> {
    try {
      const questions = await prisma.question.findMany({
        where: {
          role: role as any,
          level: level as any,
        },
        orderBy: { difficulty: 'asc' },
        take: 3,
      });

      if (questions.length > 0) {
        // Pick from the lowest difficulty group to start smoothly
        const randomIndex = Math.floor(Math.random() * questions.length);
        return this.toAdaptiveQuestion(questions[randomIndex]);
      }
    } catch (error) {
      logger.warn(`Could not fetch opening question from DB, using fallback:`, error);
    }

    return this.getDefaultFallbackQuestion(role, level);
  }

  /**
   * Pick the next adaptive question based on questions already asked
   */
  static async getNextQuestion(
    role: UserRole,
    level: InterviewLevel,
    alreadyAskedQuestionIds: string[],
    targetDifficulty?: number
  ): Promise<IAdaptiveQuestion | null> {
    try {
      const questions = await prisma.question.findMany({
        where: {
          role: role as any,
          level: level as any,
          id: { notIn: alreadyAskedQuestionIds },
          ...(targetDifficulty ? { difficulty: { gte: targetDifficulty } } : {}),
        },
        orderBy: { difficulty: 'asc' },
        take: 5,
      });

      if (questions.length === 0) {
        // Fallback to any unasked question for this role regardless of level
        const fallbackQuestions = await prisma.question.findMany({
          where: {
            role: role as any,
            id: { notIn: alreadyAskedQuestionIds },
          },
          take: 3,
        });

        if (fallbackQuestions.length > 0) {
          const picked = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
          return this.toAdaptiveQuestion(picked);
        }
        return null;
      }

      const picked = questions[Math.floor(Math.random() * questions.length)];
      return this.toAdaptiveQuestion(picked);
    } catch (error) {
      logger.error('QuestionModel.getNextQuestion error:', error);
      return null;
    }
  }

  /**
   * Analyze candidate's spoken response to check for expected technical keywords
   */
  static evaluateResponseKeywords(
    candidateSpeech: string,
    expectedKeywords: string[]
  ): {
    matchedKeywords: string[];
    missingKeywords: string[];
    coverageRatio: number;
  } {
    if (!expectedKeywords || expectedKeywords.length === 0) {
      return { matchedKeywords: [], missingKeywords: [], coverageRatio: 1.0 };
    }

    const normalizedSpeech = candidateSpeech.toLowerCase();
    const matched: string[] = [];
    const missing: string[] = [];

    for (const kw of expectedKeywords) {
      const kwLower = kw.toLowerCase();
      if (normalizedSpeech.includes(kwLower)) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    }

    return {
      matchedKeywords: matched,
      missingKeywords: missing,
      coverageRatio: matched.length / expectedKeywords.length,
    };
  }

  /**
   * Check if candidate answer triggers an adaptive follow-up probe
   */
  static shouldTriggerFollowUp(
    candidateSpeech: string,
    followUpPatterns?: string[]
  ): { shouldProbe: boolean; triggeredPattern?: string } {
    if (!followUpPatterns || followUpPatterns.length === 0) {
      return { shouldProbe: false };
    }

    const lower = candidateSpeech.toLowerCase();
    for (const pattern of followUpPatterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return { shouldProbe: true, triggeredPattern: pattern };
      }
    }

    // Also trigger probe if response is excessively brief (< 20 words for a technical question)
    const wordCount = candidateSpeech.trim().split(/\s+/).length;
    if (wordCount < 18) {
      return { shouldProbe: true, triggeredPattern: 'brevity_probe' };
    }

    return { shouldProbe: false };
  }

  /**
   * Safe parser for DB Question model
   */
  private static toAdaptiveQuestion(raw: any): IAdaptiveQuestion {
    let followUpPatterns: string[] = [];
    let expectedKeywords: string[] = [];

    try {
      if (raw.followUpPatterns) {
        followUpPatterns = typeof raw.followUpPatterns === 'string'
          ? JSON.parse(raw.followUpPatterns)
          : raw.followUpPatterns;
      }
    } catch {
      followUpPatterns = [];
    }

    try {
      if (raw.expectedKeywords) {
        expectedKeywords = typeof raw.expectedKeywords === 'string'
          ? JSON.parse(raw.expectedKeywords)
          : raw.expectedKeywords;
      }
    } catch {
      expectedKeywords = [];
    }

    return {
      id: raw.id,
      role: raw.role as UserRole,
      level: raw.level as InterviewLevel,
      topic: raw.topic,
      text: raw.text,
      difficulty: raw.difficulty,
      followUpPatterns,
      expectedKeywords,
    };
  }

  /**
   * Default fallback questions for various roles
   */
  private static getDefaultFallbackQuestion(role: UserRole, level: InterviewLevel): IAdaptiveQuestion {
    const defaults: Record<string, { topic: string; text: string; keywords: string[] }> = {
      frontend_developer: {
        topic: 'React & Web Performance',
        text: 'Can you explain the difference between the Virtual DOM and Shadow DOM, and how React optimizes re-renders using hooks like useMemo and useCallback?',
        keywords: ['virtual dom', 're-render', 'reconciliation', 'memoization'],
      },
      backend_developer: {
        topic: 'API Design & Microservices',
        text: 'How do you design a high-throughput REST or gRPC service that handles database connection pooling and graceful error recovery?',
        keywords: ['connection pool', 'latency', 'caching', 'rate limiting', 'acid'],
      },
      system_design: {
        topic: 'Distributed Systems',
        text: 'How would you design a distributed, real-time messaging system like WhatsApp or Slack with end-to-end delivery guarantees?',
        keywords: ['websocket', 'pubsub', 'kafka', 'horizontal scaling', 'replication'],
      },
      data_structures_algorithms: {
        topic: 'Graph & Tree Algorithms',
        text: 'Could you walk me through how you would detect a cycle in a directed graph, and compare the time and space complexity of BFS vs DFS for this task?',
        keywords: ['dfs', 'topological sort', 'visited set', 'recursion', 'time complexity'],
      },
      ai_engineer: {
        topic: 'LLM Architectures & RAG',
        text: 'Can you explain how a Retrieval-Augmented Generation (RAG) pipeline works, and what techniques you use to prevent hallucinations and optimize vector embeddings?',
        keywords: ['embeddings', 'vector database', 'retrieval', 'chunking', 'context window'],
      },
      software_engineer: {
        topic: 'System Architecture & Concurrency',
        text: 'Can you discuss how you handle concurrency and race conditions when multiple processes write to shared state in a distributed application?',
        keywords: ['race condition', 'mutex', 'optimistic locking', 'isolation', 'transactions'],
      },
    };

    const entry = defaults[role] || defaults.software_engineer;

    return {
      id: `default_${role}_${level}`,
      role,
      level,
      topic: entry.topic,
      text: entry.text,
      difficulty: level === 'easy' ? 3 : level === 'medium' ? 6 : 9,
      expectedKeywords: entry.keywords,
      followUpPatterns: ['why', 'trade-off', 'scaling', 'bottleneck'],
    };
  }
}
