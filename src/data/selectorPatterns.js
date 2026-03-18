export const SELECTOR_PATTERNS = [
  { selector: ".card", desc: "Elements with class 'card'" },
  { selector: "#main .item", desc: ".item inside #main" },
  { selector: 'a[href^="/tools"]', desc: "Links starting with /tools" },
  { selector: "h2 + p", desc: "Paragraph immediately after h2" },
  { selector: "[data-id]", desc: "Elements with data-id attribute" },
  { selector: "table tr td:nth-child(2)", desc: "2nd column of a table" },
  { selector: "ul > li:first-child", desc: "First list item in each list" },
  { selector: 'img[src$=".png"]', desc: "PNG images" },
];
