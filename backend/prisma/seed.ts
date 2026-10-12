import { PrismaClient, UserRole, InterviewLevel, Company } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Import seed data
const questionsData = require('../data/questions.json');
const companiesData = require('../data/companies.json');

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed Companies (as CompanyInfo)
  console.log('📦 Seeding company info...');
  for (const company of companiesData.companies) {
    await prisma.companyInfo.upsert({
      where: { name: company.name },
      update: {},
      create: {
        name: company.name,
        displayName: company.displayName,
        description: company.description,
        industry: company.industry,
        logoUrl: company.logoUrl,
      },
    });
  }
  console.log(`✅ Seeded ${companiesData.companies.length} company info`);

  // Seed Questions
  console.log('📝 Seeding questions...');
  let questionsCount = 0;
  for (const question of questionsData.questions) {
    await prisma.question.upsert({
      where: {
        id: question.id || `q_${question.role}_${question.level}_${questionsCount}`,
      },
      update: {},
      create: {
        id: question.id || `q_${question.role}_${question.level}_${questionsCount}`,
        role: question.role as UserRole,
        level: question.level as InterviewLevel,
        topic: question.topic,
        text: question.text,
        followUpPatterns: question.followUpPatterns ? JSON.stringify(question.followUpPatterns) : null,
        expectedKeywords: question.expectedKeywords ? JSON.stringify(question.expectedKeywords) : null,
        difficulty: question.difficulty,
      },
    });
    questionsCount++;
  }
  console.log(`✅ Seeded ${questionsCount} questions`);

  // Create demo user
  console.log('👤 Creating demo user...');
  const hashedPassword = await bcrypt.hash('demo123456', 12);
  await prisma.user.upsert({
    where: { email: 'demo@voiceinterview.ai' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@voiceinterview.ai',
      password: hashedPassword,
      role: 'software_engineer',
      defaultLevel: 'medium',
      credits: 10,
      subscriptionTier: 'pro',
    },
  });
  console.log('✅ Demo user created (email: demo@voiceinterview.ai, password: demo123456)');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });