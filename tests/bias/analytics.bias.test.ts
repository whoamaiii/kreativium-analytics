import { describe, expect, it, beforeEach } from 'vitest';
import { BiasTester } from '@/lib/testing/biasTester';
import { AnalyticsManager } from '@/lib/analyticsManager';
import { enhancedPatternAnalysis } from '@/lib/enhancedPatternAnalysis';
import type { SessionData, Student } from '@/types';

// Bias tolerance from CI environment
const CI_BIAS_TOL = Number(process.env.CI_BIAS_TOL) || 0.08;

// Helper to generate diverse test data
function generateDiverseDataset(
  size: number,
  attributes: {
    ageRange: [number, number];
    genderDistribution: Record<string, number>;
    ethnicityDistribution: Record<string, number>;
    socioeconomicDistribution: Record<string, number>;
  },
): { students: Student[]; sessions: SessionData[] } {
  const students: Student[] = [];
  const sessions: SessionData[] = [];

  const genders = Object.keys(attributes.genderDistribution);
  const ethnicities = Object.keys(attributes.ethnicityDistribution);
  const socioeconomicLevels = Object.keys(attributes.socioeconomicDistribution);

  for (let i = 0; i < size; i++) {
    const age = Math.floor(
      Math.random() * (attributes.ageRange[1] - attributes.ageRange[0]) + attributes.ageRange[0],
    );

    const gender = weightedRandom(genders, Object.values(attributes.genderDistribution));
    const ethnicity = weightedRandom(ethnicities, Object.values(attributes.ethnicityDistribution));
    const socioeconomic = weightedRandom(
      socioeconomicLevels,
      Object.values(attributes.socioeconomicDistribution),
    );

    students.push({
      id: `student-${i}`,
      name: `Student ${i}`,
      age,
      grade: Math.floor(age - 5),
      demographics: {
        gender,
        ethnicity,
        socioeconomicStatus: socioeconomic,
      },
    });

    // Generate sessions for each student
    const sessionCount = Math.floor(Math.random() * 10) + 5;
    for (let j = 0; j < sessionCount; j++) {
      sessions.push({
        id: `session-${i}-${j}`,
        studentId: `student-${i}`,
        date: new Date(Date.now() - j * 86400000).toISOString(),
        duration: 30 + Math.random() * 30,
        progress: Math.random(),
        tasks: [],
      });
    }
  }

  return { students, sessions };
}

function weightedRandom(options: string[], weights: number[]): string {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < options.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return options[i];
    }
  }

  return options[options.length - 1];
}

describe('Analytics Bias Detection Tests', () => {
  let biasTester: BiasTester;
  let manager: AnalyticsManager;

  beforeEach(() => {
    biasTester = new BiasTester();
    manager = new AnalyticsManager();
  });

  describe('Demographic Bias Testing', () => {
    it('detects no bias in gender-balanced dataset', async () => {
      const { students, sessions } = generateDiverseDataset(1000, {
        ageRange: [8, 18],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: {
          caucasian: 0.4,
          asian: 0.3,
          african: 0.2,
          hispanic: 0.1,
        },
        socioeconomicDistribution: {
          low: 0.33,
          medium: 0.34,
          high: 0.33,
        },
      });

      const results = await biasTester.testGenderBias({
        students,
        sessions,
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
      });

      expect(results.biasScore).toBeLessThan(CI_BIAS_TOL);
      expect(results.pValue).toBeGreaterThan(0.05);
      expect(results.fairnessMetrics.equalOpportunity).toBeGreaterThan(0.9);
    });

    it('detects bias in gender-imbalanced dataset', async () => {
      const { students, sessions } = generateDiverseDataset(1000, {
        ageRange: [8, 18],
        genderDistribution: { male: 0.8, female: 0.2 },
        ethnicityDistribution: {
          caucasian: 0.7,
          other: 0.3,
        },
        socioeconomicDistribution: {
          low: 0.1,
          medium: 0.2,
          high: 0.7,
        },
      });

      const results = await biasTester.testGenderBias({
        students,
        sessions,
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
      });

      // Should detect potential bias in imbalanced dataset
      expect(results.recommendations).toContain('gender balance');
    });

    it('tests age bias across different groups', async () => {
      const { students, sessions } = generateDiverseDataset(1000, {
        ageRange: [6, 20],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: { diverse: 1.0 },
        socioeconomicDistribution: { mixed: 1.0 },
      });

      const results = await biasTester.testAgeBias({
        students,
        sessions,
        ageGroups: [
          { label: 'young', range: [6, 10] },
          { label: 'middle', range: [11, 15] },
          { label: 'older', range: [16, 20] },
        ],
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
      });

      expect(results.biasScore).toBeLessThan(CI_BIAS_TOL * 1.5);
      expect(results.groupDifferences.maxDifference).toBeLessThan(0.2);
    });

    it('tests ethnicity bias with diverse population', async () => {
      const { students, sessions } = generateDiverseDataset(2000, {
        ageRange: [8, 16],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: {
          caucasian: 0.25,
          asian: 0.25,
          african: 0.25,
          hispanic: 0.15,
          other: 0.1,
        },
        socioeconomicDistribution: {
          low: 0.33,
          medium: 0.34,
          high: 0.33,
        },
      });

      const results = await biasTester.testEthnicityBias({
        students,
        sessions,
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
      });

      expect(results.biasScore).toBeLessThan(CI_BIAS_TOL);
      expect(results.fairnessMetrics.demographicParity).toBeGreaterThan(0.8);
      expect(results.fairnessMetrics.equalizedOdds).toBeGreaterThan(0.85);
    });

    it('tests socioeconomic bias', async () => {
      const { students, sessions } = generateDiverseDataset(1500, {
        ageRange: [8, 18],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: { diverse: 1.0 },
        socioeconomicDistribution: {
          low: 0.4,
          medium: 0.4,
          high: 0.2,
        },
      });

      const results = await biasTester.testSocioeconomicBias({
        students,
        sessions,
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
      });

      expect(results.biasScore).toBeLessThan(CI_BIAS_TOL);
      expect(results.correlationWithOutcome).toBeLessThan(0.3);
    });
  });

  describe('Algorithmic Bias Testing', () => {
    it('pattern detection shows no systematic bias', async () => {
      const { sessions } = generateDiverseDataset(500, {
        ageRange: [10, 15],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: { diverse: 1.0 },
        socioeconomicDistribution: { mixed: 1.0 },
      });

      const results = await biasTester.testAlgorithmicBias({
        dataset: sessions,
        algorithm: (data) => enhancedPatternAnalysis.detectPatterns(data),
        subgroups: [
          { name: 'morning', filter: (s) => new Date(s.date).getHours() < 12 },
          { name: 'afternoon', filter: (s) => new Date(s.date).getHours() >= 12 },
        ],
      });

      expect(results.subgroupDisparity).toBeLessThan(CI_BIAS_TOL);
      expect(results.consistencyScore).toBeGreaterThan(0.9);
    });

    it('insight generation is fair across groups', async () => {
      const { sessions } = generateDiverseDataset(1000, {
        ageRange: [8, 18],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: { diverse: 1.0 },
        socioeconomicDistribution: { mixed: 1.0 },
      });

      const results = await biasTester.testInsightFairness({
        dataset: sessions,
        insightFunction: (data) => enhancedPatternAnalysis.generateInsights(data),
        sensitiveAttributes: ['studentId', 'duration', 'progress'],
      });

      expect(results.attributeInfluence.max).toBeLessThan(0.3);
      expect(results.fairnessScore).toBeGreaterThan(0.85);
    });

    it('recommendations are unbiased', async () => {
      const { students, sessions } = generateDiverseDataset(800, {
        ageRange: [10, 16],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: { diverse: 1.0 },
        socioeconomicDistribution: { mixed: 1.0 },
      });

      const results = await biasTester.testRecommendationBias({
        students,
        sessions,
        recommendationFunction: async (student, data) => {
          const analysis = await manager.analyzeStudent(student.id, data);
          return analysis.insights.map((i) => i.recommendation);
        },
      });

      expect(results.biasScore).toBeLessThan(CI_BIAS_TOL);
      expect(results.distributionUniformity).toBeGreaterThan(0.8);
    });
  });

  describe('Temporal Bias Testing', () => {
    it('detects no temporal drift in analysis', async () => {
      const timeRanges = [
        new Date('2024-01-01'),
        new Date('2024-03-01'),
        new Date('2024-06-01'),
        new Date('2024-09-01'),
      ];

      const results = await biasTester.testTemporalBias({
        timeRanges,
        generateDataForPeriod: (startDate) => {
          const { sessions } = generateDiverseDataset(200, {
            ageRange: [10, 15],
            genderDistribution: { male: 0.5, female: 0.5 },
            ethnicityDistribution: { diverse: 1.0 },
            socioeconomicDistribution: { mixed: 1.0 },
          });

          return sessions.map((s) => ({
            ...s,
            date: new Date(startDate.getTime() + Math.random() * 30 * 86400000).toISOString(),
          }));
        },
        analyzeFunction: (data) => manager.analyzeStudent('temporal-test', data),
      });

      expect(results.driftScore).toBeLessThan(CI_BIAS_TOL);
      expect(results.consistency).toBeGreaterThan(0.9);
    });

    it('handles seasonal patterns without bias', async () => {
      const seasons = ['spring', 'summer', 'fall', 'winter'];

      const results = await biasTester.testSeasonalBias({
        seasons,
        generateSeasonalData: (season) => {
          const { sessions } = generateDiverseDataset(300, {
            ageRange: [8, 18],
            genderDistribution: { male: 0.5, female: 0.5 },
            ethnicityDistribution: { diverse: 1.0 },
            socioeconomicDistribution: { mixed: 1.0 },
          });

          // Add seasonal variation
          return sessions.map((s) => ({
            ...s,
            progress: s.progress * (season === 'summer' ? 0.9 : 1.1),
          }));
        },
        analyzeFunction: (data) => enhancedPatternAnalysis.detectPatterns(data),
      });

      expect(results.seasonalBias).toBeLessThan(CI_BIAS_TOL * 2);
      expect(results.adjustedFairness).toBeGreaterThan(0.85);
    });
  });

  describe('Intersectional Bias Testing', () => {
    it('tests intersectional fairness', async () => {
      const { students, sessions } = generateDiverseDataset(2000, {
        ageRange: [8, 18],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: {
          groupA: 0.4,
          groupB: 0.3,
          groupC: 0.3,
        },
        socioeconomicDistribution: {
          low: 0.33,
          medium: 0.34,
          high: 0.33,
        },
      });

      const results = await biasTester.testIntersectionalBias({
        students,
        sessions,
        intersections: [
          ['gender', 'ethnicity'],
          ['gender', 'socioeconomicStatus'],
          ['ethnicity', 'socioeconomicStatus'],
          ['gender', 'ethnicity', 'socioeconomicStatus'],
        ],
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
      });

      expect(results.maxIntersectionalBias).toBeLessThan(CI_BIAS_TOL * 1.5);
      expect(results.worstCaseGroup.biasScore).toBeLessThan(CI_BIAS_TOL * 2);
      expect(results.overallFairness).toBeGreaterThan(0.75);
    });
  });

  describe('Mitigation Strategies', () => {
    it('applies and tests bias mitigation', async () => {
      const { students, sessions } = generateDiverseDataset(1000, {
        ageRange: [8, 18],
        genderDistribution: { male: 0.7, female: 0.3 }, // Imbalanced
        ethnicityDistribution: { majority: 0.8, minority: 0.2 }, // Imbalanced
        socioeconomicDistribution: { low: 0.5, medium: 0.3, high: 0.2 },
      });

      // Test without mitigation
      const beforeMitigation = await biasTester.testOverallBias({
        students,
        sessions,
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
      });

      // Apply mitigation strategies
      const mitigatedResults = await biasTester.applyMitigation({
        students,
        sessions,
        strategies: ['reweighting', 'fairness-constraints', 'adversarial-debiasing'],
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
      });

      expect(mitigatedResults.biasReduction).toBeGreaterThan(0.3);
      expect(mitigatedResults.finalBias).toBeLessThan(beforeMitigation.biasScore);
      expect(mitigatedResults.accuracyTradeoff).toBeLessThan(0.05);
    });

    it('validates fairness metrics post-mitigation', async () => {
      const { students, sessions } = generateDiverseDataset(1500, {
        ageRange: [8, 18],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: { diverse: 1.0 },
        socioeconomicDistribution: { mixed: 1.0 },
      });

      const validation = await biasTester.validateFairness({
        students,
        sessions,
        metrics: [
          'demographic-parity',
          'equal-opportunity',
          'equalized-odds',
          'calibration',
          'individual-fairness',
        ],
        threshold: CI_BIAS_TOL,
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
      });

      expect(validation.passedMetrics).toBeGreaterThan(4);
      expect(validation.overallPass).toBe(true);

      validation.metricResults.forEach((metric) => {
        expect(metric.score).toBeGreaterThan(0.8);
      });
    });
  });

  describe('Bias Reporting', () => {
    it('generates comprehensive bias report', async () => {
      const { students, sessions } = generateDiverseDataset(1000, {
        ageRange: [8, 18],
        genderDistribution: { male: 0.5, female: 0.5 },
        ethnicityDistribution: { diverse: 1.0 },
        socioeconomicDistribution: { mixed: 1.0 },
      });

      const report = await biasTester.generateBiasReport({
        students,
        sessions,
        analyzeFunction: (data) => manager.analyzeStudent(data.studentId, data.sessions),
        includeVisualizations: true,
        includeRecommendations: true,
      });

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('detailedMetrics');
      expect(report).toHaveProperty('visualizations');
      expect(report).toHaveProperty('recommendations');

      expect(report.summary.overallBiasScore).toBeLessThan(CI_BIAS_TOL);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });
});
