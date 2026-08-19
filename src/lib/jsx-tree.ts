import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import type { JSXElement, JSXFragment } from "@babel/types";

export interface JsxTreeNode {
  tag: string;
  id?: string;
  /** Present only when the className is a plain string literal —
   * className="a b c". Absent (not empty-string) when it's anything
   * dynamic: a template literal, a function call, a conditional expression.
   * That distinction matters to the caller: a static className is safe to
   * hand to QuickStylePanel's exact-match direct-edit path (see
   * quick-style.ts), because it's guaranteed to match what actually renders
   * in the DOM. A dynamic one is not — the rendered value could differ from
   * anything visible in source, so pretending to know it would let a
   * "safe" direct edit silently target the wrong string. */
  staticClassName?: string;
  isDynamicClassName: boolean;
  /** Same static-vs-dynamic distinction as staticClassName, applied to the
   * src attribute — only ever set from a plain string literal, so a caller
   * can safely use it as the exact-match target for a find-and-replace
   * (see applyAttributeEdit in quick-style.ts). A computed/templated src
   * is left unset rather than guessed. */
  staticSrc?: string;
  /** Same static-string-literal-only capture as staticSrc/staticClassName,
   * for the alt and aria-label attributes — used by nodeHasAccessibleName
   * below to determine whether an element (typically a button or link) has
   * a real accessible name. */
  staticAlt?: string;
  staticAriaLabel?: string;
  text?: string;
  children: JsxTreeNode[];
}

export interface ParseResult {
  tree: JsxTreeNode[];
  /** Non-null when the source couldn't be parsed at all (a genuine syntax
   * error) or had no JSX-returning component to find. The Layers panel
   * shows this instead of silently rendering an empty tree, since an empty
   * tree and "couldn't read this file" are different situations a person
   * looking at the panel needs to tell apart. */
  error: string | null;
}

const INTERESTING_TAGS = new Set([
  "section", "header", "footer", "nav", "main", "article", "aside",
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "button", "img", "form",
  "input", "ul", "ol", "li", "div", "span",
]);

/** Parses a generated component's source and returns the tree of JSX
 * elements its default export actually renders. Deliberately conservative
 * about what counts as a "layer" worth showing: only tags in
 * INTERESTING_TAGS become tree nodes — a bare layout wrapper with no
 * semantic or interactive meaning is skipped in favor of its children, so
 * the tree reflects the page's real structure instead of every incidental
 * <div> the AI happened to generate. */
export function parseJsxTree(source: string): ParseResult {
  let ast;
  try {
    ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] });
  } catch (err) {
    return { tree: [], error: err instanceof Error ? `Couldn't parse this file: ${err.message}` : "Couldn't parse this file." };
  }

  let rootElement: JSXElement | JSXFragment | null = null;

  traverse(ast, {
    ReturnStatement(path) {
      const arg = path.node.argument;
      if (!arg) return;
      // Handles both `return <div>...</div>` and the parenthesized
      // `return (\n  <div>...\n)` form — both parse to the same
      // JSXElement/JSXFragment node type, so no separate case is needed.
      if (arg.type === "JSXElement" || arg.type === "JSXFragment") {
        rootElement = arg;
        path.stop();
      }
    },
  });

  if (!rootElement) {
    return { tree: [], error: "No JSX return statement found in this component." };
  }

  return { tree: buildNodes(rootElement), error: null };
}

function buildNodes(node: JSXElement | JSXFragment): JsxTreeNode[] {
  if (node.type === "JSXFragment") {
    return node.children.flatMap(childToNodes);
  }
  const single = elementToNode(node);
  return single ? [single] : node.children.flatMap(childToNodes);
}

function childToNodes(child: JSXElement["children"][number]): JsxTreeNode[] {
  if (child.type === "JSXElement") {
    const node = elementToNode(child);
    return node ? [node] : child.children.flatMap(childToNodes);
  }
  if (child.type === "JSXFragment") {
    return child.children.flatMap(childToNodes);
  }
  return [];
}

/** Returns a single node for an "interesting" tag, or null for anything
 * else (a layout wrapper, a custom component reference) — callers fall back
 * to flattening that element's own children in the null case, so an
 * uninteresting wrapper's interesting descendants still surface at the
 * right logical position instead of being lost. */
function elementToNode(el: JSXElement): JsxTreeNode | null {
  const name = el.openingElement.name;
  const tag = name.type === "JSXIdentifier" ? name.name : null;
  if (!tag || !INTERESTING_TAGS.has(tag.toLowerCase())) return null;

  let id: string | undefined;
  let staticClassName: string | undefined;
  let isDynamicClassName = false;
  let staticSrc: string | undefined;
  let staticAlt: string | undefined;
  let staticAriaLabel: string | undefined;

  for (const attr of el.openingElement.attributes) {
    if (attr.type !== "JSXAttribute" || attr.name.type !== "JSXIdentifier") continue;
    if (attr.name.name === "id" && attr.value?.type === "StringLiteral") {
      id = attr.value.value;
    }
    if (attr.name.name === "src" && attr.value?.type === "StringLiteral") {
      staticSrc = attr.value.value;
    }
    if (attr.name.name === "alt" && attr.value?.type === "StringLiteral") {
      staticAlt = attr.value.value;
    }
    // Babel parses a hyphenated attribute like aria-label as a single
    // JSXIdentifier whose .name is the whole string "aria-label" — not as
    // JSXNamespacedName, which is reserved for actual XML-namespace syntax
    // (xlink:href and similar). This match is correct as written.
    if (attr.name.name === "aria-label" && attr.value?.type === "StringLiteral") {
      staticAriaLabel = attr.value.value;
    }
    if (attr.name.name === "className") {
      if (attr.value?.type === "StringLiteral") {
        staticClassName = attr.value.value;
      } else if (attr.value != null) {
        isDynamicClassName = true;
      }
    }
  }

  const text = el.children
    .filter((c) => c.type === "JSXText")
    .map((c) => c.value)
    .join(" ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);

  return {
    tag,
    id,
    staticClassName,
    isDynamicClassName,
    staticSrc,
    staticAlt,
    staticAriaLabel,
    text: text.length > 0 ? text : undefined,
    children: el.children.flatMap(childToNodes),
  };
}

/** Recursively determines whether a node (typically a <button> or <a>) has a
 * real accessible name: its own aria-label, visible text anywhere in its
 * subtree — not just direct children, since `<button><span>Learn
 * more</span></button>` has "Learn more" as a *grandchild* text node of the
 * button, not a direct one — or a descendant <img> with meaningful alt text.
 *
 * This is exactly the kind of nested-structure question a regex over raw
 * source text cannot answer reliably (matching balanced, arbitrarily nested
 * tags is not a regular language), which is why this accessibility check
 * lives here on the real parsed tree rather than as another regex in
 * seo-audit.ts alongside its simpler, genuinely regex-tractable checks
 * (self-closing <img alt="...">, heading counts). */
export function nodeHasAccessibleName(node: JsxTreeNode): boolean {
  if (node.staticAriaLabel && node.staticAriaLabel.trim().length > 0) return true;
  if (node.text && node.text.trim().length > 0) return true;
  if (node.tag.toLowerCase() === "img" && node.staticAlt && node.staticAlt.trim().length > 0) return true;
  return node.children.some(nodeHasAccessibleName);
}

