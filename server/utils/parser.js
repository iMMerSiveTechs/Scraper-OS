/**
 * Multi-format file parser.
 * Normalizes different file types into a common item schema for the intelligence pipeline.
 */

import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';

/**
 * Parse a file's content based on its extension.
 * Returns normalized items for the scraper results pipeline.
 */
export async function parseFile(content, filename, filePath) {
  const ext = path.extname(filename).toLowerCase().slice(1);
  const now = new Date().toISOString();

  const base = {
    source: 'file',
    sourceType: ext || 'text',
    url: `file://${filePath || filename}`,
    scrapedAt: now,
  };

  switch (ext) {
    case 'json':
      return parseJSON(content, filename, base);
    case 'csv':
    case 'tsv':
      return parseCSV(content, filename, ext, base);
    case 'md':
    case 'markdown':
      return parseMarkdown(content, filename, base);
    case 'txt':
      return parseText(content, filename, base);
    case 'js':
    case 'mjs':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'py':
    case 'rb':
    case 'go':
    case 'rs':
      return parseCode(content, filename, ext, base);
    case 'pdf':
      return parsePDF(content, filename, base);
    default:
      return [{ ...base, title: filename, content: content.slice(0, 2000), metadata: { lineCount: content.split('\n').length } }];
  }
}

function parseJSON(content, filename, base) {
  try {
    const data = JSON.parse(content);

    // If it's an array, each item becomes a result
    if (Array.isArray(data)) {
      return data.slice(0, 100).map((item, i) => ({
        ...base,
        title: item.title || item.name || `${filename} [${i}]`,
        content: JSON.stringify(item, null, 2).slice(0, 500),
        metadata: { index: i, keys: Object.keys(item) },
        ...extractCommonFields(item),
      }));
    }

    // Single object
    return [{
      ...base,
      title: data.title || data.name || filename,
      content: JSON.stringify(data, null, 2).slice(0, 2000),
      metadata: { keys: Object.keys(data), type: 'object' },
    }];
  } catch {
    return [{ ...base, title: filename, content: content.slice(0, 2000), metadata: { error: 'Invalid JSON' } }];
  }
}

function parseCSV(content, filename, ext, base) {
  try {
    const delimiter = ext === 'tsv' ? '\t' : ',';
    const records = csvParse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
      relax_column_count: true,
    });

    const headers = records.length > 0 ? Object.keys(records[0]) : [];

    return records.slice(0, 100).map((row, i) => ({
      ...base,
      sourceType: 'csv',
      title: row.title || row.name || row.Title || row.Name || `${filename} row ${i + 1}`,
      content: headers.map((h) => `${h}: ${row[h]}`).join('\n'),
      metadata: { headers, rowIndex: i },
      ...extractCommonFields(row),
    }));
  } catch (err) {
    return [{ ...base, title: filename, content: content.slice(0, 2000), metadata: { error: err.message } }];
  }
}

function parseMarkdown(content, filename, base) {
  // Split by headings
  const sections = content.split(/^(#{1,3}\s.+)$/m);
  const items = [];

  // Extract frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = fmMatch ? fmMatch[1] : null;

  let currentTitle = filename;
  let currentContent = '';

  for (const section of sections) {
    if (section.match(/^#{1,3}\s/)) {
      // Save previous section
      if (currentContent.trim()) {
        items.push({
          ...base,
          sourceType: 'markdown',
          title: currentTitle,
          content: currentContent.trim().slice(0, 1000),
          metadata: { heading: currentTitle, frontmatter },
        });
      }
      currentTitle = section.replace(/^#+\s/, '').trim();
      currentContent = '';
    } else {
      currentContent += section;
    }
  }

  // Last section
  if (currentContent.trim()) {
    items.push({
      ...base,
      sourceType: 'markdown',
      title: currentTitle,
      content: currentContent.trim().slice(0, 1000),
      metadata: { heading: currentTitle, frontmatter },
    });
  }

  // If no sections found, return whole file
  if (items.length === 0) {
    items.push({
      ...base,
      sourceType: 'markdown',
      title: filename,
      content: content.slice(0, 2000),
      metadata: { lineCount: content.split('\n').length },
    });
  }

  return items;
}

function parseText(content, filename, base) {
  const lines = content.split('\n');
  return [{
    ...base,
    sourceType: 'text',
    title: lines[0]?.trim().slice(0, 100) || filename,
    content: content.slice(0, 2000),
    metadata: { lineCount: lines.length, wordCount: content.split(/\s+/).length },
  }];
}

function parseCode(content, filename, ext, base) {
  const lines = content.split('\n');

  // Extract structural elements
  const imports = lines.filter((l) => l.match(/^(import |from |require\(|#include|use |using )/)).map((l) => l.trim());
  const functions = lines
    .map((l, i) => ({ line: l, num: i + 1 }))
    .filter(({ line }) => line.match(/^(export )?(async )?(function |def |class |const \w+ = |fn |func )/))
    .map(({ line, num }) => ({ name: line.trim().slice(0, 80), line: num }));
  const todos = lines
    .map((l, i) => ({ line: l, num: i + 1 }))
    .filter(({ line }) => line.match(/\/\/\s*(TODO|FIXME|HACK|XXX|NOTE)/i))
    .map(({ line, num }) => ({ text: line.trim(), line: num }));

  return [{
    ...base,
    sourceType: 'code',
    title: filename,
    content: content.slice(0, 3000),
    metadata: {
      language: ext,
      lineCount: lines.length,
      imports: imports.slice(0, 20),
      functions: functions.slice(0, 30),
      todos: todos.slice(0, 10),
    },
  }];
}

async function parsePDF(content, filename, base) {
  // content is a Buffer when coming from multer
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(typeof content === 'string' ? Buffer.from(content) : content);

    return [{
      ...base,
      sourceType: 'pdf',
      title: data.info?.Title || filename,
      content: data.text.slice(0, 5000),
      metadata: {
        pages: data.numpages,
        author: data.info?.Author,
        creator: data.info?.Creator,
        wordCount: data.text.split(/\s+/).length,
      },
    }];
  } catch (err) {
    return [{ ...base, title: filename, content: '', metadata: { error: `PDF parse failed: ${err.message}` } }];
  }
}

function extractCommonFields(obj) {
  const result = {};
  if (obj.url || obj.URL || obj.link) result.url = obj.url || obj.URL || obj.link;
  if (obj.description || obj.desc || obj.summary) result.description = obj.description || obj.desc || obj.summary;
  if (obj.score || obj.rating) result.score = Number(obj.score || obj.rating) || undefined;
  if (obj.tags) result.tags = Array.isArray(obj.tags) ? obj.tags : String(obj.tags).split(',');
  return result;
}
