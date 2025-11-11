#!/usr/bin/env tsx
/**
 * Performance Analysis Script
 * Analyzes React components for potential performance issues
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface PerformanceIssue {
  file: string;
  line: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  code?: string;
}

interface ComponentMetrics {
  file: string;
  name: string;
  linesOfCode: number;
  complexityScore: number;
  issues: PerformanceIssue[];
  renderComplexity: number;
  effectsCount: number;
  memoizationScore: number;
}

class PerformanceAnalyzer {
  private issues: PerformanceIssue[] = [];
  private metrics: ComponentMetrics[] = [];

  async analyze(directory: string = 'src/components'): Promise<void> {
    const files = await glob(`${directory}/**/*.{tsx,jsx}`, {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
    });

    console.log(`🔍 Analyzing ${files.length} component files...\n`);

    for (const file of files) {
      await this.analyzeFile(file);
    }

    this.generateReport();
  }

  private async analyzeFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileName = path.basename(filePath);

    const componentName = this.extractComponentName(content) || fileName;

    const metrics: ComponentMetrics = {
      file: filePath,
      name: componentName,
      linesOfCode: lines.length,
      complexityScore: 0,
      issues: [],
      renderComplexity: 0,
      effectsCount: 0,
      memoizationScore: 0,
    };

    // Check for performance anti-patterns
    this.checkForHeavyComputationsInRender(content, filePath, metrics);
    this.checkForMissingMemoization(content, filePath, metrics);
    this.checkForExcessiveEffects(content, filePath, metrics);
    this.checkForInlineArrayMapChains(content, filePath, metrics);
    this.checkForUnoptimizedListRendering(content, filePath, metrics);
    this.checkForFrequentStateUpdates(content, filePath, metrics);
    this.checkForExpensiveInitialState(content, filePath, metrics);
    this.checkForLargeInlineFunctions(content, filePath, metrics);
    this.checkForNestedMapOperations(content, filePath, metrics);
    this.checkForSynchronousIO(content, filePath, metrics);

    // Calculate complexity scores
    metrics.complexityScore = this.calculateComplexity(content);
    metrics.renderComplexity = this.calculateRenderComplexity(content);
    metrics.memoizationScore = this.calculateMemoizationScore(content);

    if (metrics.issues.length > 0 || metrics.complexityScore > 100) {
      this.metrics.push(metrics);
    }
  }

  private extractComponentName(content: string): string | null {
    const patterns = [
      /export\s+(?:const|function)\s+(\w+)/,
      /const\s+(\w+)\s*[:=]\s*(?:React\.)?(?:memo|forwardRef)/,
      /function\s+(\w+)\s*\(/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private checkForHeavyComputationsInRender(
    content: string,
    file: string,
    metrics: ComponentMetrics,
  ): void {
    // Check for heavy array operations in render
    const heavyOps = [
      /(?<!useMemo\([^)]*)\b(?:filter|map|reduce|sort)\s*\([^)]*\)\s*\.(?:filter|map|reduce|sort)/gm,
      /for\s*\([^)]*\)\s*{[^}]*for\s*\(/gm, // Nested loops
      /JSON\.parse\s*\([^)]+\)/gm, // JSON parsing in render
      /new\s+Date\(\)\.getTime\(\)/gm, // Date operations
      /Object\.entries\([^)]+\)\.map/gm, // Object iteration
    ];

    heavyOps.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        metrics.issues.push({
          file,
          line,
          type: 'heavy-computation',
          severity: 'high',
          message: `Heavy computation detected in render path: ${match[0].substring(0, 50)}...`,
          code: match[0],
        });
      }
    });
  }

  private checkForMissingMemoization(
    content: string,
    file: string,
    metrics: ComponentMetrics,
  ): void {
    // Check for components without memoization that receive complex props
    const hasComplexProps = /interface\s+\w+Props[^{]*{[^}]*\[].*}/s.test(content);
    const hasMemo = /React\.memo|useMemo|useCallback/g.test(content);

    if (hasComplexProps && !hasMemo && content.length > 500) {
      metrics.issues.push({
        file,
        line: 1,
        type: 'missing-memoization',
        severity: 'medium',
        message: 'Component with complex props lacks memoization',
      });
    }

    // Check for expensive calculations without useMemo
    const expensiveCalcs =
      /const\s+\w+\s*=\s*[^;]*\.(?:filter|map|reduce|sort)[^;]*(?:filter|map|reduce|sort)/gm;
    const matches = content.matchAll(expensiveCalcs);

    for (const match of matches) {
      if (!content.substring(Math.max(0, match.index! - 100), match.index).includes('useMemo')) {
        const line = content.substring(0, match.index).split('\n').length;
        metrics.issues.push({
          file,
          line,
          type: 'unmemoized-calculation',
          severity: 'high',
          message: 'Expensive calculation without useMemo',
          code: match[0].substring(0, 80),
        });
      }
    }
  }

  private checkForExcessiveEffects(content: string, file: string, metrics: ComponentMetrics): void {
    const effectCount = (content.match(/useEffect/g) || []).length;
    metrics.effectsCount = effectCount;

    if (effectCount > 5) {
      metrics.issues.push({
        file,
        line: 1,
        type: 'excessive-effects',
        severity: 'medium',
        message: `Component has ${effectCount} useEffect hooks (consider consolidation)`,
      });
    }

    // Check for effects with heavy dependencies
    const heavyDepEffects = /useEffect\([^}]+\[[^\]]{100,}\]/gm;
    const matches = content.matchAll(heavyDepEffects);

    for (const match of matches) {
      const line = content.substring(0, match.index).split('\n').length;
      metrics.issues.push({
        file,
        line,
        type: 'heavy-effect-deps',
        severity: 'high',
        message: 'useEffect with many dependencies detected',
      });
    }
  }

  private checkForInlineArrayMapChains(
    content: string,
    file: string,
    metrics: ComponentMetrics,
  ): void {
    // Look for chained array operations in JSX
    const chainedOps =
      /{[^}]*\.\s*(?:filter|map|reduce|flatMap)\s*\([^)]*\)\s*\.\s*(?:filter|map|reduce|flatMap)/gm;
    const matches = content.matchAll(chainedOps);

    for (const match of matches) {
      const line = content.substring(0, match.index).split('\n').length;
      metrics.issues.push({
        file,
        line,
        type: 'inline-array-chains',
        severity: 'high',
        message: 'Chained array operations in render method',
        code: match[0].substring(0, 80),
      });
    }
  }

  private checkForUnoptimizedListRendering(
    content: string,
    file: string,
    metrics: ComponentMetrics,
  ): void {
    // Check for missing keys in map operations
    const mapWithoutKey = /\.map\s*\([^)]*\)\s*=>\s*[^}]*<[^>]+(?!key=)/gm;
    const missingKeyMatches = content.matchAll(mapWithoutKey);
    for (const match of missingKeyMatches) {
      const line = content.substring(0, match.index).split('\n').length;
      metrics.issues.push({
        file,
        line,
        type: 'missing-react-key',
        severity: 'medium',
        message: 'List item rendered without a React key prop',
        code: match[0].substring(0, 80),
      });
    }

    // Check for using index as key
    const indexAsKey = /key\s*=\s*{\s*(?:index|i|idx)\s*}/gm;
    const indexMatches = content.matchAll(indexAsKey);

    for (const match of indexMatches) {
      const line = content.substring(0, match.index).split('\n').length;
      metrics.issues.push({
        file,
        line,
        type: 'index-as-key',
        severity: 'medium',
        message: 'Using array index as React key (causes re-renders)',
        code: match[0],
      });
    }

    // Check for large lists without virtualization
    const largeListPattern = /\.slice\(0,\s*(\d+)\)|take\((\d+)\)/g;
    const listMatches = content.matchAll(largeListPattern);

    for (const match of listMatches) {
      const count = parseInt(match[1] || match[2]);
      if (count > 50) {
        const line = content.substring(0, match.index).split('\n').length;
        metrics.issues.push({
          file,
          line,
          type: 'large-list',
          severity: 'high',
          message: `Rendering ${count}+ items without virtualization`,
          code: match[0],
        });
      }
    }
  }

  private checkForFrequentStateUpdates(
    content: string,
    file: string,
    metrics: ComponentMetrics,
  ): void {
    // Check for setState in loops
    const setStateInLoop = /(?:for|while|forEach|map)[^}]*set[A-Z]\w+\(/gm;
    const matches = content.matchAll(setStateInLoop);

    for (const match of matches) {
      const line = content.substring(0, match.index).split('\n').length;
      metrics.issues.push({
        file,
        line,
        type: 'setState-in-loop',
        severity: 'critical',
        message: 'setState called inside a loop (causes multiple re-renders)',
        code: match[0].substring(0, 80),
      });
    }

    // Check for multiple state updates without batching
    const multipleSetStates = /(set\w+\([^)]*\)\s*[;\n]\s*){3,}/gm;
    const multiMatches = content.matchAll(multipleSetStates);

    for (const match of multiMatches) {
      const line = content.substring(0, match.index).split('\n').length;
      metrics.issues.push({
        file,
        line,
        type: 'unbatched-updates',
        severity: 'high',
        message: 'Multiple setState calls without batching',
        code: match[0].substring(0, 100),
      });
    }
  }

  private checkForExpensiveInitialState(
    content: string,
    file: string,
    metrics: ComponentMetrics,
  ): void {
    // Check for expensive initial state calculations
    const expensiveInit = /useState\s*\([^)]*\.(?:filter|map|reduce|sort)/gm;
    const matches = content.matchAll(expensiveInit);

    for (const match of matches) {
      if (!match[0].includes('() =>')) {
        const line = content.substring(0, match.index).split('\n').length;
        metrics.issues.push({
          file,
          line,
          type: 'expensive-initial-state',
          severity: 'high',
          message: 'Expensive calculation in useState without lazy initialization',
          code: match[0].substring(0, 80),
        });
      }
    }
  }

  private checkForLargeInlineFunctions(
    content: string,
    file: string,
    metrics: ComponentMetrics,
  ): void {
    // Check for large inline functions in JSX
    const inlineFuncs =
      /(?:onClick|onChange|onSubmit)\s*=\s*{\s*(?:\([^)]*\)|[^}])\s*=>\s*{[^}]{100,}}/gm;
    const matches = content.matchAll(inlineFuncs);

    for (const match of matches) {
      const line = content.substring(0, match.index).split('\n').length;
      metrics.issues.push({
        file,
        line,
        type: 'large-inline-function',
        severity: 'medium',
        message: 'Large inline function in JSX (recreated on each render)',
        code: match[0].substring(0, 50) + '...',
      });
    }
  }

  private checkForNestedMapOperations(
    content: string,
    file: string,
    metrics: ComponentMetrics,
  ): void {
    // Check for nested map operations (O(n²) complexity)
    const nestedMaps = /\.map\([^}]*\.map\(/gm;
    const matches = content.matchAll(nestedMaps);

    for (const match of matches) {
      const line = content.substring(0, match.index).split('\n').length;
      metrics.issues.push({
        file,
        line,
        type: 'nested-maps',
        severity: 'critical',
        message: 'Nested map operations detected (O(n²) complexity)',
        code: match[0].substring(0, 80),
      });
    }
  }

  private checkForSynchronousIO(content: string, file: string, metrics: ComponentMetrics): void {
    // Check for synchronous operations that block rendering
    const syncOps = [
      /localStorage\.(getItem|setItem)/gm,
      /sessionStorage\.(getItem|setItem)/gm,
      /JSON\.stringify\([^)]*\)/gm,
      /\.toLocaleString\(\)/gm,
    ];

    syncOps.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        // Check if it's in a useEffect or async function
        const context = content.substring(Math.max(0, match.index! - 100), match.index);
        if (!context.includes('useEffect') && !context.includes('async')) {
          const line = content.substring(0, match.index).split('\n').length;
          metrics.issues.push({
            file,
            line,
            type: 'sync-io',
            severity: 'medium',
            message: `Synchronous I/O operation in render path: ${match[0]}`,
            code: match[0],
          });
        }
      }
    });
  }

  private calculateComplexity(content: string): number {
    let score = 0;

    // Count complexity indicators
    score += (content.match(/if\s*\(/g) || []).length * 2;
    score += (content.match(/for\s*\(/g) || []).length * 5;
    score += (content.match(/while\s*\(/g) || []).length * 5;
    score += (content.match(/switch\s*\(/g) || []).length * 3;
    score += (content.match(/\?\s*[^:]+\s*:/g) || []).length * 1; // Ternary operators
    score += (content.match(/&&|\|\|/g) || []).length * 0.5; // Logical operators
    score += (content.match(/\.map\(/g) || []).length * 2;
    score += (content.match(/\.filter\(/g) || []).length * 2;
    score += (content.match(/\.reduce\(/g) || []).length * 3;

    return Math.round(score);
  }

  private calculateRenderComplexity(content: string): number {
    let score = 0;

    // Find the return statement of the component
    const returnMatch = content.match(/return\s*\([^)]*\)/s);
    if (returnMatch) {
      const renderContent = returnMatch[0];
      score += (renderContent.match(/\.map\(/g) || []).length * 3;
      score += (renderContent.match(/\?[^:]+:/g) || []).length * 2;
      score += (renderContent.match(/&&/g) || []).length * 1;
    }

    return score;
  }

  private calculateMemoizationScore(content: string): number {
    let score = 0;

    score += (content.match(/React\.memo/g) || []).length * 10;
    score += (content.match(/useMemo/g) || []).length * 5;
    score += (content.match(/useCallback/g) || []).length * 5;
    score -= (content.match(/\.map\(/g) || []).length * 2; // Penalty for unmemoized maps

    return Math.max(0, score);
  }

  private generateReport(): void {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    PERFORMANCE ANALYSIS REPORT                   ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Sort metrics by number of critical/high issues
    const sortedMetrics = this.metrics.sort((a, b) => {
      const aCritical = a.issues.filter((i) => i.severity === 'critical').length;
      const bCritical = b.issues.filter((i) => i.severity === 'critical').length;
      const aHigh = a.issues.filter((i) => i.severity === 'high').length;
      const bHigh = b.issues.filter((i) => i.severity === 'high').length;

      if (aCritical !== bCritical) return bCritical - aCritical;
      if (aHigh !== bHigh) return bHigh - aHigh;
      return b.complexityScore - a.complexityScore;
    });

    // Show top problematic components
    console.log('🔴 TOP PERFORMANCE BOTTLENECKS:\n');

    const topIssues = sortedMetrics.slice(0, 10);
    topIssues.forEach((metric, index) => {
      const critical = metric.issues.filter((i) => i.severity === 'critical').length;
      const high = metric.issues.filter((i) => i.severity === 'high').length;
      const medium = metric.issues.filter((i) => i.severity === 'medium').length;

      console.log(`${index + 1}. ${metric.name} (${path.relative(process.cwd(), metric.file)})`);
      console.log(
        `   Complexity: ${metric.complexityScore} | Render: ${metric.renderComplexity} | Effects: ${metric.effectsCount}`,
      );
      console.log(`   Issues: ${critical} critical, ${high} high, ${medium} medium`);

      // Show critical issues for this component
      const criticalIssues = metric.issues.filter((i) => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        criticalIssues.forEach((issue) => {
          console.log(`   ⚠️  Line ${issue.line}: ${issue.message}`);
          if (issue.code) {
            console.log(`      Code: ${issue.code.substring(0, 60)}...`);
          }
        });
      }
      console.log('');
    });

    // Summary statistics
    console.log('📊 SUMMARY STATISTICS:\n');

    const allIssues = sortedMetrics.flatMap((m) => m.issues);
    const critical = allIssues.filter((i) => i.severity === 'critical').length;
    const high = allIssues.filter((i) => i.severity === 'high').length;
    const medium = allIssues.filter((i) => i.severity === 'medium').length;
    const low = allIssues.filter((i) => i.severity === 'low').length;

    console.log(`Total components analyzed: ${this.metrics.length}`);
    console.log(`Total issues found: ${allIssues.length}`);
    console.log(`  - Critical: ${critical}`);
    console.log(`  - High: ${high}`);
    console.log(`  - Medium: ${medium}`);
    console.log(`  - Low: ${low}\n`);

    // Issue type breakdown
    console.log('📋 ISSUE TYPES:\n');

    const issueTypes = new Map<string, number>();
    allIssues.forEach((issue) => {
      issueTypes.set(issue.type, (issueTypes.get(issue.type) || 0) + 1);
    });

    const sortedTypes = Array.from(issueTypes.entries()).sort((a, b) => b[1] - a[1]);
    sortedTypes.forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:\n');

    if (critical > 0) {
      console.log('🔴 CRITICAL: Address these issues immediately:');
      console.log('  - Fix setState calls inside loops');
      console.log('  - Optimize nested map operations (O(n²) complexity)');
      console.log('  - Break down complex components\n');
    }

    if (high > 5) {
      console.log('🟠 HIGH PRIORITY:');
      console.log('  - Add memoization to expensive calculations');
      console.log('  - Implement virtual scrolling for large lists');
      console.log('  - Move heavy computations outside render methods\n');
    }

    console.log('🟢 GENERAL OPTIMIZATIONS:');
    console.log('  - Use React.memo for components with stable props');
    console.log('  - Implement useMemo/useCallback for expensive operations');
    console.log('  - Consider code splitting for large components');
    console.log('  - Use React DevTools Profiler to measure actual impact\n');

    // Export detailed report
    const reportPath = path.join(process.cwd(), 'performance-report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          summary: {
            componentsAnalyzed: this.metrics.length,
            totalIssues: allIssues.length,
            critical,
            high,
            medium,
            low,
          },
          components: sortedMetrics,
          issues: allIssues,
        },
        null,
        2,
      ),
    );

    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the analyzer
const analyzer = new PerformanceAnalyzer();
analyzer.analyze(process.argv[2] || 'src/components').catch(console.error);
