import { ScanReport } from '../providers/reportsProvider';

/**
 * Generate an SVG circular gauge for the score
 */
export function generateScoreGauge(score: number, size: number = 200): string {
  const radius = size / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;
  
  // Color based on score
  let color: string;
  if (score >= 70) color = '#22c55e'; // green
  else if (score >= 50) color = '#eab308'; // yellow
  else color = '#ef4444'; // red
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .gauge-bg { fill: none; stroke: #374151; stroke-width: 12; }
    .gauge-progress { fill: none; stroke: ${color}; stroke-width: 12; stroke-linecap: round; transform: rotate(-90deg); transform-origin: center; transition: stroke-dashoffset 0.5s ease; }
    .gauge-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: bold; fill: #f9fafb; text-anchor: middle; }
    .gauge-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; fill: #9ca3af; text-anchor: middle; }
  </style>
  <circle class="gauge-bg" cx="${size/2}" cy="${size/2}" r="${radius}" />
  <circle class="gauge-progress" cx="${size/2}" cy="${size/2}" r="${radius}" 
    stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
  <text class="gauge-text" x="${size/2}" y="${size/2 + 8}">${score}</text>
  <text class="gauge-label" x="${size/2}" y="${size/2 + 30}">AI Readiness Score</text>
</svg>
`;
}

/**
 * Generate SVG bar chart for issue breakdown
 */
export function generateIssueBreakdownChart(
  critical: number,
  major: number,
  minor: number,
  info: number,
  width: number = 300,
  height: number = 150
): string {
  const maxValue = Math.max(critical, major, minor, info, 1);
  const barWidth = (width - 100) / 4;
  const chartHeight = height - 40;
  
  const getHeight = (value: number) => (value / maxValue) * chartHeight;
  
  const data = [
    { label: 'Critical', value: critical, color: '#ef4444' },
    { label: 'Major', value: major, color: '#f97316' },
    { label: 'Minor', value: minor, color: '#eab308' },
    { label: 'Info', value: info, color: '#3b82f6' }
  ];
  
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .bar-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; fill: #9ca3af; text-anchor: middle; }
    .bar-value { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: bold; fill: #f9fafb; text-anchor: middle; }
  </style>
  ${data.map((d, i) => {
    const barHeight = getHeight(d.value);
    const x = 30 + i * barWidth + 10;
    const y = chartHeight - barHeight + 10;
    return `
    <rect x="${x}" y="${y}" width="${barWidth - 10}" height="${barHeight}" rx="4" fill="${d.color}" />
    <text class="bar-value" x="${x + (barWidth - 10) / 2}" y="${y - 5}">${d.value}</text>
    <text class="bar-label" x="${x + (barWidth - 10) / 2}" y="${chartHeight + 25}">${d.label}</text>
    `;
  }).join('')}
</svg>
`;
}

/**
 * Generate horizontal bar chart for tool scores
 */
export function generateToolScoresChart(
  tools: Array<{ name: string; score: number; rating: string }>,
  width: number = 300,
  height: number = 150
): string {
  if (tools.length === 0) {
    return `<svg width="${width}" height="50" viewBox="0 0 ${width} 50" xmlns="http://www.w3.org/2000/svg">
      <text x="${width/2}" y="30" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle">No tool breakdown available</text>
    </svg>`;
  }
  
  const barHeight = 24;
  const chartHeight = tools.length * (barHeight + 12) + 20;
  const maxBarWidth = width - 120;
  
  return `
<svg width="${width}" height="${chartHeight}" viewBox="0 0 ${width} ${chartHeight}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .tool-name { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; fill: #f9fafb; }
    .tool-score { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: bold; fill: #f9fafb; text-anchor: end; }
    .tool-bar-bg { fill: #374151; rx: 4; }
  </style>
  ${tools.map((tool, i) => {
    const y = 20 + i * (barHeight + 12);
    const barWidth = (tool.score / 100) * maxBarWidth;
    const color = tool.score >= 70 ? '#22c55e' : tool.score >= 50 ? '#eab308' : '#ef4444';
    
    return `
    <text class="tool-name" x="0" y="${y + 16}">${tool.name}</text>
    <rect class="tool-bar-bg" x="90" y="${y}" width="${maxBarWidth}" height="${barHeight}" />
    <rect x="90" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color}" />
    <text class="tool-score" x="${90 + maxBarWidth + 5}" y="${y + 16}">${tool.score}/100</text>
    `;
  }).join('')}
</svg>
`;
}

/**
 * Generate a sparkline trend chart
 */
export function generateSparklineChart(
  scores: number[],
  width: number = 200,
  height: number = 40
): string {
  if (scores.length < 2) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width/2}" y="25" font-family="sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle">Need more data points</text>
    </svg>`;
  }
  
  const padding = 5;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const minScore = Math.min(...scores) - 10;
  const maxScore = Math.max(...scores) + 10;
  const scoreRange = maxScore - minScore;
  
  const points = scores.map((score, i) => {
    const x = padding + (i / (scores.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((score - minScore) / scoreRange) * chartHeight;
    return `${x},${y}`;
  }).join(' ');
  
  // Determine color based on trend
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const color = lastScore >= firstScore ? '#22c55e' : '#ef4444';
  
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .sparkline-area { fill: ${color}; opacity: 0.2; }
    .sparkline-line { fill: none; stroke: ${color}; stroke-width: 2; }
    .sparkline-dot { fill: ${color}; }
  </style>
  <defs>
    <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
    </linearGradient>
  </defs>
  <path class="sparkline-area" d="M${padding},${padding + chartHeight} ${points} ${padding + chartWidth},${padding + chartHeight} Z" fill="url(#sparkGradient)" />
  <path class="sparkline-line" d="M${points}" />
  ${scores.map((score, i) => {
    const x = padding + (i / (scores.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((score - minScore) / scoreRange) * chartHeight;
    return `<circle class="sparkline-dot" cx="${x}" cy="${y}" r="3" />`;
  }).join('')}
</svg>
`;
}

/**
 * Generate the full HTML for the report detail view
 */
export function generateReportDetailHTML(report: ScanReport, recentScores: number[] = []): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #1f2937;
      color: #f9fafb;
      padding: 20px;
      min-height: 100vh;
    }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { color: #9ca3af; font-size: 14px; }
    .card {
      background-color: #374151;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
    .score-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .rating {
      text-align: center;
      margin-top: 12px;
      font-size: 18px;
      font-weight: 600;
      color: ${report.score >= 70 ? '#22c55e' : report.score >= 50 ? '#eab308' : '#ef4444'};
    }
    .stats-row {
      display: flex;
      justify-content: space-around;
      text-align: center;
    }
    .stat { flex: 1; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #9ca3af; }
    .stat-critical .stat-value { color: #ef4444; }
    .stat-major .stat-value { color: #f97316; }
    .stat-minor .stat-value { color: #eab308; }
    .stat-info .stat-value { color: #3b82f6; }
    .trend-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .trend-label { font-size: 14px; color: #9ca3af; }
    .charts-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .chart-card { flex: 1; min-width: 250px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AIReady Report</h1>
      <p>${report.fileName}</p>
    </div>
    
    <div class="card">
      <div class="card-title">Overall Score</div>
      <div class="score-container">
        ${generateScoreGauge(report.score, 180)}
      </div>
      <div class="rating">${report.rating}</div>
    </div>
    
    <div class="card">
      <div class="card-title">Issue Breakdown</div>
      <div class="stats-row">
        <div class="stat stat-critical">
          <div class="stat-value">${report.criticalIssues}</div>
          <div class="stat-label">Critical</div>
        </div>
        <div class="stat stat-major">
          <div class="stat-value">${report.majorIssues}</div>
          <div class="stat-label">Major</div>
        </div>
        <div class="stat stat-minor">
          <div class="stat-value">${report.minorIssues}</div>
          <div class="stat-label">Minor</div>
        </div>
        <div class="stat stat-info">
          <div class="stat-value">${report.infoIssues}</div>
          <div class="stat-label">Info</div>
        </div>
      </div>
    </div>
    
    <div class="card chart-card">
      <div class="card-title">Tool Scores</div>
      ${generateToolScoresChart(report.tools)}
    </div>
    
    ${recentScores.length >= 2 ? `
    <div class="card">
      <div class="card-title">Score Trend</div>
      <div class="trend-container">
        <span class="trend-label">Recent scores over time</span>
        ${generateSparklineChart(recentScores)}
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>
`;
}
