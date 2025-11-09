/**
 * HTML Report Formatter
 *
 * Generates HTML output for PDF reports with print-optimized styling.
 * Pure function that transforms ReportContent into formatted HTML.
 */

import type { ReportContent, PDFReportOptions } from "./types";

/**
 * Generates a print-ready HTML report from structured content
 *
 * @param content - Structured report content
 * @param options - Report generation options (for chart inclusion)
 * @returns HTML string ready for PDF conversion or printing
 */
export function generateHTMLReport(content: ReportContent, options: PDFReportOptions): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(content.header.title)}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
        }
        .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            border: 1px solid #e5e7eb;
            padding: 15px;
            border-radius: 8px;
        }
        .chart-placeholder {
            height: 200px;
            background: #f9fafb;
            border: 1px dashed #d1d5db;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px 0;
        }
        .goal-item {
            margin-bottom: 15px;
            padding: 10px;
            background: #f9fafb;
            border-left: 3px solid #2563eb;
        }
        @media print {
            body { margin: 20px; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    ${generateHeaderSection(content.header)}
    ${generateSummarySection(content.summary)}
    ${generateEmotionSection(content.emotionAnalysis, options.includeCharts)}
    ${generateSensorySection(content.sensoryAnalysis, options.includeCharts)}
    ${generateGoalSection(content.goalProgress)}
    ${generateRecommendationsSection(content.recommendations)}
</body>
</html>
    `.trim();
}

/**
 * Generates the header section of the report
 */
function generateHeaderSection(header: ReportContent['header']): string {
  return `
    <div class="header">
        <h1>${escapeHtml(header.title)}</h1>
        <p><strong>Period:</strong> ${escapeHtml(header.dateRange)}</p>
        <p><strong>Generated:</strong> ${escapeHtml(header.generatedDate)}</p>
        <p><strong>Student ID:</strong> ${escapeHtml(header.studentInfo.id)}</p>
        ${header.studentInfo.grade ? `<p><strong>Grade:</strong> ${escapeHtml(header.studentInfo.grade)}</p>` : ''}
    </div>`;
}

/**
 * Generates the summary section with key metrics
 */
function generateSummarySection(summary: ReportContent['summary']): string {
  return `
    <div class="section">
        <h2>Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Tracking Sessions</h3>
                <p style="font-size: 24px; font-weight: bold;">${summary.totalSessions}</p>
            </div>
            <div class="summary-card">
                <h3>Emotions Recorded</h3>
                <p style="font-size: 24px; font-weight: bold;">${summary.totalEmotions}</p>
            </div>
            <div class="summary-card">
                <h3>Sensory Inputs</h3>
                <p style="font-size: 24px; font-weight: bold;">${summary.totalSensoryInputs}</p>
            </div>
            <div class="summary-card">
                <h3>Active Goals</h3>
                <p style="font-size: 24px; font-weight: bold;">${summary.activeGoals}</p>
            </div>
        </div>
    </div>`;
}

/**
 * Generates the emotional analysis section
 */
function generateEmotionSection(
  emotionAnalysis: ReportContent['emotionAnalysis'],
  includeCharts?: boolean
): string {
  return `
    <div class="section">
        <h2>Emotional Analysis</h2>
        <p><strong>Most Common Emotion:</strong> ${escapeHtml(emotionAnalysis.mostCommon)}</p>
        <p><strong>Average Intensity:</strong> ${escapeHtml(emotionAnalysis.avgIntensity)}</p>
        <p><strong>Positive Emotion Rate:</strong> ${escapeHtml(emotionAnalysis.positiveRate)}%</p>
        ${includeCharts ? '<div class="chart-placeholder">Emotion Trends Chart</div>' : ''}
    </div>`;
}

/**
 * Generates the sensory analysis section
 */
function generateSensorySection(
  sensoryAnalysis: ReportContent['sensoryAnalysis'],
  includeCharts?: boolean
): string {
  return `
    <div class="section">
        <h2>Sensory Analysis</h2>
        <p><strong>Seeking vs Avoiding:</strong> ${escapeHtml(sensoryAnalysis.seekingRatio)}% seeking</p>
        <p><strong>Most Common Type:</strong> ${escapeHtml(sensoryAnalysis.mostCommonType)}</p>
        ${includeCharts ? '<div class="chart-placeholder">Sensory Patterns Chart</div>' : ''}
    </div>`;
}

/**
 * Generates the goal progress section
 */
function generateGoalSection(goalProgress: ReportContent['goalProgress']): string {
  const goalItems = goalProgress.map(goal => `
            <div class="goal-item">
                <h3>${escapeHtml(goal.title)}</h3>
                <p><strong>Progress:</strong> ${goal.progress}% complete</p>
                <p><strong>Status:</strong> ${escapeHtml(goal.status)}</p>
            </div>
        `).join('');

  return `
    <div class="section">
        <h2>Goal Progress</h2>
        ${goalItems}
    </div>`;
}

/**
 * Generates the recommendations section
 */
function generateRecommendationsSection(recommendations: string[]): string {
  const recommendationItems = recommendations.map(rec =>
    `<li>${escapeHtml(rec)}</li>`
  ).join('');

  return `
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            ${recommendationItems}
        </ul>
    </div>`;
}

/**
 * Escapes HTML special characters to prevent XSS
 *
 * @param text - Text to escape
 * @returns HTML-safe text
 */
function escapeHtml(text: string | undefined): string {
  if (!text) return '';

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => htmlEscapeMap[char]);
}
