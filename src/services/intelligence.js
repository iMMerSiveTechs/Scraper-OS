/**
 * Intelligence Engine — AI-Powered Analysis (BYOK)
 *
 * Provides structured analysis of scraped data using user's own API keys.
 * Works with OpenAI and Anthropic APIs directly from the browser.
 * Gracefully degrades: no key = raw data only, key = full analysis.
 */

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    buildHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    buildBody: (model, messages, maxTokens) => ({
      model: model || 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens || 2048,
      temperature: 0.3,
    }),
    extractContent: (res) => res.choices?.[0]?.message?.content || '',
  },
  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-20250514',
    buildHeaders: (key) => ({
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    buildBody: (model, messages, maxTokens) => ({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens || 2048,
      messages: messages.filter((m) => m.role !== 'system'),
      system: messages.find((m) => m.role === 'system')?.content || '',
    }),
    extractContent: (res) => res.content?.[0]?.text || '',
  },
};

/**
 * Call an LLM provider with the given messages.
 */
async function callLLM(provider, apiKey, messages, options = {}) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: config.buildHeaders(apiKey),
    body: JSON.stringify(config.buildBody(options.model, messages, options.maxTokens)),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error');
    throw new Error(`${config.name} API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return config.extractContent(data);
}

/**
 * Validate an API key by making a minimal request.
 */
export async function validateApiKey(provider, apiKey) {
  try {
    await callLLM(provider, apiKey, [
      { role: 'user', content: 'Say "ok"' },
    ], { maxTokens: 5 });
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Digest Prompts
// ---------------------------------------------------------------------------

const DIGEST_SYSTEM = `You are an intelligence analyst for a web scraping platform called Scraper OS. You analyze scraped data from multiple sources (Hacker News, GitHub Trending, Product Hunt, RSS feeds, custom scrapers) and produce structured intelligence briefings.

Your output must be valid JSON with this exact structure:
{
  "summary": "2-3 sentence executive overview",
  "trends": [
    { "topic": "trend name", "signal": "weak|emerging|strong", "sources": ["source1"], "detail": "one sentence" }
  ],
  "notable": [
    { "title": "item title", "source": "source", "why": "why it's notable", "url": "url if available" }
  ],
  "crossSource": [
    { "topic": "topic appearing across sources", "sources": ["src1", "src2"], "insight": "what this convergence means" }
  ],
  "sentiment": { "overall": "positive|neutral|mixed|negative", "breakdown": "one sentence" },
  "actionItems": [
    { "action": "suggested action", "priority": "high|medium|low", "reason": "why" }
  ]
}

Be concise, specific, and data-driven. Reference actual items from the data.`;

const PROJECT_SYSTEM = `You are a strategic research assistant for Scraper OS. Given a user's project context and recent scraped data, synthesize an actionable project brief.

Your output must be valid JSON with this exact structure:
{
  "relevance": "high|medium|low",
  "briefing": "2-3 sentence summary of how recent data relates to this project",
  "opportunities": [
    { "title": "opportunity name", "source": "data source", "detail": "actionable description", "priority": "high|medium|low" }
  ],
  "competitors": [
    { "name": "competitor/similar project", "source": "where spotted", "detail": "what they're doing" }
  ],
  "technologies": [
    { "name": "tech/tool name", "trending": true, "detail": "relevance to project" }
  ],
  "outline": [
    { "section": "section heading", "points": ["bullet point 1", "bullet point 2"] }
  ],
  "nextSteps": ["actionable step 1", "actionable step 2"]
}

Be specific to the project. Reference actual data points. Focus on actionable intelligence.`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a daily digest from scraped results.
 */
export async function generateDigest(provider, apiKey, results, options = {}) {
  // Group results by source
  const bySource = {};
  for (const item of results) {
    const src = item.source || 'unknown';
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(item);
  }

  // Build data summary (limit to avoid token overflow)
  const dataSummary = Object.entries(bySource)
    .map(([source, items]) => {
      const sample = items.slice(0, 20).map((item) => {
        const parts = [item.title];
        if (item.score) parts.push(`score:${item.score}`);
        if (item.url) parts.push(item.url);
        if (item.description) parts.push(item.description.slice(0, 100));
        if (item.tags?.length) parts.push(`tags:${item.tags.join(',')}`);
        return `  - ${parts.join(' | ')}`;
      }).join('\n');
      return `## ${source} (${items.length} items)\n${sample}`;
    })
    .join('\n\n');

  const messages = [
    { role: 'system', content: DIGEST_SYSTEM },
    {
      role: 'user',
      content: `Analyze this scraped data from ${new Date().toLocaleDateString()} and produce the intelligence briefing JSON:\n\n${dataSummary}`,
    },
  ];

  const raw = await callLLM(provider, apiKey, messages, options);
  return parseJSONResponse(raw);
}

/**
 * Generate a project-specific synthesis.
 */
export async function generateProjectBrief(provider, apiKey, project, results, options = {}) {
  const dataSummary = results.slice(0, 50).map((item) => {
    const parts = [item.source, item.title];
    if (item.url) parts.push(item.url);
    if (item.description) parts.push(item.description.slice(0, 80));
    return `- ${parts.join(' | ')}`;
  }).join('\n');

  const projectContext = [
    `Project: ${project.name || project.app}`,
    project.idea && `Description: ${project.idea}`,
    project.notes && `Notes: ${project.notes}`,
    project.targets?.length && `Targets: ${project.targets.join(', ')}`,
    project.subtasks?.length && `Tasks: ${project.subtasks.map((s) => s.text).join(', ')}`,
  ].filter(Boolean).join('\n');

  const messages = [
    { role: 'system', content: PROJECT_SYSTEM },
    {
      role: 'user',
      content: `Generate a project brief for this project based on the latest scraped data.\n\n### Project Context\n${projectContext}\n\n### Recent Scraped Data\n${dataSummary}`,
    },
  ];

  const raw = await callLLM(provider, apiKey, messages, options);
  return parseJSONResponse(raw);
}

/**
 * Run a custom analysis prompt against the data.
 */
export async function customAnalysis(provider, apiKey, prompt, results, options = {}) {
  const dataSummary = results.slice(0, 40).map((item) => {
    return `[${item.source}] ${item.title}${item.url ? ` — ${item.url}` : ''}`;
  }).join('\n');

  const messages = [
    {
      role: 'system',
      content: 'You are an intelligence analyst. Respond in clean markdown. Be concise and specific.',
    },
    {
      role: 'user',
      content: `${prompt}\n\n### Data\n${dataSummary}`,
    },
  ];

  return callLLM(provider, apiKey, messages, options);
}

/**
 * Extract JSON from LLM response (handles markdown code blocks).
 */
function parseJSONResponse(raw) {
  // Try direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // Try extracting from code block
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // Fall through
      }
    }
    // Return as wrapped string
    return { raw, parseError: true };
  }
}

/**
 * Get available providers and their status.
 */
export function getProviderStatus(settings) {
  return Object.entries(PROVIDERS).map(([id, config]) => ({
    id,
    name: config.name,
    hasKey: !!(settings?.[`${id}Key`]),
    model: settings?.[`${id}Model`] || config.defaultModel,
  }));
}
