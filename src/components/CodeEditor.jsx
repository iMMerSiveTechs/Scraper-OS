import { useRef, useEffect, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching } from "@codemirror/language";
import { defaultKeymap, indentWithTab, history, historyKeymap } from "@codemirror/commands";
import { tags } from "@lezer/highlight";

// Custom dark theme matching Scraper OS palette
const scraperTheme = EditorView.theme({
  "&": {
    backgroundColor: "#080810",
    color: "#c8c8d0",
    fontSize: "12px",
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  },
  ".cm-content": {
    padding: "16px 0",
    caretColor: "#00ff88",
  },
  ".cm-cursor": {
    borderLeftColor: "#00ff88",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#1a1a3e",
  },
  ".cm-activeLine": {
    backgroundColor: "#0a0a1a",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#0a0a1a",
  },
  ".cm-gutters": {
    backgroundColor: "#0c0c14",
    color: "#333",
    border: "none",
    borderRight: "1px solid #1a1a2e",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 12px",
    minWidth: "32px",
  },
  ".cm-foldGutter": {
    width: "0px",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-matchingBracket": {
    backgroundColor: "#00ff8833",
    outline: "1px solid #00ff8844",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
}, { dark: true });

const scraperHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#a78bfa" },
  { tag: tags.operator, color: "#a78bfa" },
  { tag: tags.string, color: "#00ff88" },
  { tag: tags.templateLiteral, color: "#00ff88" },
  { tag: tags.number, color: "#ff6b35" },
  { tag: tags.bool, color: "#ff6b35" },
  { tag: tags.null, color: "#ff6b35" },
  { tag: tags.comment, color: "#555", fontStyle: "italic" },
  { tag: tags.function(tags.variableName), color: "#00d4ff" },
  { tag: tags.definition(tags.variableName), color: "#e0e0e8" },
  { tag: tags.variableName, color: "#c8c8d0" },
  { tag: tags.propertyName, color: "#c8c8d0" },
  { tag: tags.typeName, color: "#ffaa00" },
  { tag: tags.className, color: "#ffaa00" },
  { tag: tags.punctuation, color: "#888" },
  { tag: tags.paren, color: "#888" },
  { tag: tags.brace, color: "#888" },
  { tag: tags.bracket, color: "#888" },
  { tag: tags.regexp, color: "#ff6b35" },
  { tag: tags.special(tags.string), color: "#00ff88" },
]);

export function CodeEditor({ value, onChange, minHeight = "450px" }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track if we're programmatically updating
  const isExternalUpdate = useRef(false);

  const handleUpdate = useCallback((update) => {
    if (update.docChanged && !isExternalUpdate.current) {
      const newValue = update.state.doc.toString();
      onChangeRef.current(newValue);
    }
  }, []);

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        javascript(),
        scraperTheme,
        syntaxHighlighting(scraperHighlight),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of(handleUpdate),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes (e.g., reset, template load)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (value !== currentValue) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{ minHeight, maxHeight: "600px", overflow: "auto" }}
      aria-label="Code editor"
    />
  );
}
