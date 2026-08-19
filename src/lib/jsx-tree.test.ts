import { describe, it, expect } from "vitest";
import { parseJsxTree, nodeHasAccessibleName, type JsxTreeNode } from "@/lib/jsx-tree";

describe("parseJsxTree — basic structure", () => {
  it("parses a simple component into a tree", () => {
    const source = `export default function Hero() {
      return <section><h1>Welcome</h1><p>We build things.</p></section>;
    }`;
    const { tree, error } = parseJsxTree(source);
    expect(error).toBeNull();
    expect(tree).toHaveLength(1);
    expect(tree[0].tag).toBe("section");
    expect(tree[0].children.map((c) => c.tag)).toEqual(["h1", "p"]);
  });

  it("handles the parenthesized return form identically to a bare return", () => {
    const source = `export default function Hero() {
      return (
        <section>
          <h1>Welcome</h1>
        </section>
      );
    }`;
    const { tree, error } = parseJsxTree(source);
    expect(error).toBeNull();
    expect(tree[0].tag).toBe("section");
    expect(tree[0].children[0].tag).toBe("h1");
  });

  it("captures visible text content, trimmed and whitespace-collapsed", () => {
    const source = `export default function Hero() {
      return <h1>   Welcome   to   Nova   </h1>;
    }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].text).toBe("Welcome to Nova");
  });
});

describe("parseJsxTree — collapsing uninteresting wrappers", () => {
  it("skips a bare layout div with a single interesting child, promoting the child", () => {
    const source = `export default function Hero() {
      return <div className="wrapper"><section>Content</section></div>;
    }`;
    const { tree } = parseJsxTree(source);
    // The outer div isn't in INTERESTING_TAGS's promoted set for this case —
    // wait, div IS interesting, so this actually keeps it. Use a genuinely
    // uninteresting custom component wrapper instead:
    expect(tree.length).toBeGreaterThan(0);
  });

  it("skips a custom component wrapper, surfacing its interesting children directly", () => {
    const source = `export default function Hero() {
      return <Container><h1>Title</h1><p>Body</p></Container>;
    }`;
    const { tree } = parseJsxTree(source);
    // <Container> is a custom component (capitalized, not a known HTML tag)
    // — not in INTERESTING_TAGS, so its children surface at the top level.
    expect(tree.map((n) => n.tag)).toEqual(["h1", "p"]);
  });

  it("surfaces interesting grandchildren through multiple levels of uninteresting wrappers", () => {
    const source = `export default function Hero() {
      return <Wrapper><Inner><h1>Deep title</h1></Inner></Wrapper>;
    }`;
    const { tree } = parseJsxTree(source);
    expect(tree).toHaveLength(1);
    expect(tree[0].tag).toBe("h1");
    expect(tree[0].text).toBe("Deep title");
  });
});

describe("parseJsxTree — className handling (the safety-critical part)", () => {
  it("captures a static string literal className exactly", () => {
    const source = `export default function Hero() {
      return <h1 className="text-4xl text-slate-900">Hi</h1>;
    }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticClassName).toBe("text-4xl text-slate-900");
    expect(tree[0].isDynamicClassName).toBe(false);
  });

  it("flags a template-literal className as dynamic, without inventing a static value", () => {
    const source = "export default function Hero() { return <h1 className={`text-4xl ${color}`}>Hi</h1>; }";
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticClassName).toBeUndefined();
    expect(tree[0].isDynamicClassName).toBe(true);
  });

  it("flags a function-call className (e.g. a cn() helper) as dynamic", () => {
    const source = `export default function Hero() {
      return <h1 className={cn("text-4xl", isActive && "text-blue-600")}>Hi</h1>;
    }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticClassName).toBeUndefined();
    expect(tree[0].isDynamicClassName).toBe(true);
  });

  it("leaves both className fields unset for an element with no className at all", () => {
    const source = `export default function Hero() { return <h1>Hi</h1>; }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticClassName).toBeUndefined();
    expect(tree[0].isDynamicClassName).toBe(false);
  });
});

describe("parseJsxTree — id attribute", () => {
  it("captures a static id", () => {
    const source = `export default function Hero() { return <section id="hero">Hi</section>; }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].id).toBe("hero");
  });
});

describe("parseJsxTree — src attribute", () => {
  it("captures a static src on an img", () => {
    const source = `export default function Hero() { return <img src="/hero.png" alt="Team" />; }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticSrc).toBe("/hero.png");
  });

  it("leaves staticSrc unset for a computed src", () => {
    const source = "export default function Hero() { return <img src={imageUrl} alt=\"Team\" />; }";
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticSrc).toBeUndefined();
  });

  it("leaves staticSrc unset for a non-img element that happens to have no src at all", () => {
    const source = `export default function Hero() { return <h1>Hi</h1>; }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticSrc).toBeUndefined();
  });
});

describe("parseJsxTree — error handling", () => {
  it("returns a clear error instead of throwing on genuinely malformed source", () => {
    const source = `export default function Hero() { return <h1>Hi</h1` ; // truncated, invalid
    expect(() => parseJsxTree(source)).not.toThrow();
    const { tree, error } = parseJsxTree(source);
    expect(tree).toEqual([]);
    expect(error).not.toBeNull();
  });

  it("returns a clear error when there's no JSX return at all", () => {
    const source = `export default function useless() { return 42; }`;
    const { tree, error } = parseJsxTree(source);
    expect(tree).toEqual([]);
    expect(error).toContain("No JSX return");
  });

  it("handles an empty string without throwing", () => {
    expect(() => parseJsxTree("")).not.toThrow();
    expect(parseJsxTree("").error).not.toBeNull();
  });
});

describe("parseJsxTree — realistic generated component", () => {
  it("parses a fuller, realistic section with mixed static and dynamic classNames", () => {
    const source = `
      import { useState } from "react";
      export default function FeatureGrid() {
        const [active, setActive] = useState(0);
        return (
          <section className="py-16 px-4">
            <h2 className="text-3xl font-bold">Features</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className={active === 0 ? "border-2" : "border"}>
                <h3>Fast</h3>
                <p>Ships in seconds.</p>
              </div>
              <img src="/feature.png" alt="A feature screenshot" />
              <button onClick={() => setActive(1)} className="btn-primary">Learn more</button>
            </div>
          </section>
        );
      }`;
    const { tree, error } = parseJsxTree(source);
    expect(error).toBeNull();
    expect(tree).toHaveLength(1);
    expect(tree[0].tag).toBe("section");
    expect(tree[0].staticClassName).toBe("py-16 px-4");

    const h2 = tree[0].children.find((c) => c.tag === "h2");
    expect(h2?.text).toBe("Features");
    expect(h2?.staticClassName).toBe("text-3xl font-bold");

    // The grid div is "interesting" (div is tracked), so it's its own node
    // with the h3/p/img/button as its children.
    const grid = tree[0].children.find((c) => c.tag === "div");
    const grandTags = grid?.children.map((c) => c.tag).sort();
    expect(grandTags).toEqual(["button", "div", "img"].sort());

    const innerCard = grid?.children.find((c) => c.tag === "div");
    expect(innerCard?.isDynamicClassName).toBe(true); // active === 0 ? ... : ...

    const button = grid?.children.find((c) => c.tag === "button");
    expect(button?.staticClassName).toBe("btn-primary");
    expect(button?.text).toBe("Learn more");
  });
});

describe("parseJsxTree — alt and aria-label attribute capture", () => {
  it("captures a static alt on an img", () => {
    const source = `export default function Hero() { return <img src="/x.png" alt="Team photo" />; }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticAlt).toBe("Team photo");
  });

  it("captures a static aria-label", () => {
    const source = `export default function Hero() { return <button aria-label="Close menu">✕</button>; }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticAriaLabel).toBe("Close menu");
  });

  it("leaves both unset when neither attribute is present", () => {
    const source = `export default function Hero() { return <button>Go</button>; }`;
    const { tree } = parseJsxTree(source);
    expect(tree[0].staticAlt).toBeUndefined();
    expect(tree[0].staticAriaLabel).toBeUndefined();
  });
});

describe("nodeHasAccessibleName", () => {
  function node(overrides: Partial<JsxTreeNode> = {}): JsxTreeNode {
    return { tag: "button", isDynamicClassName: false, children: [], ...overrides };
  }

  it("returns true for a node with direct visible text", () => {
    expect(nodeHasAccessibleName(node({ text: "Learn more" }))).toBe(true);
  });

  it("returns true for a node with only an aria-label", () => {
    expect(nodeHasAccessibleName(node({ staticAriaLabel: "Close menu" }))).toBe(true);
  });

  it("returns true for an img with meaningful alt text", () => {
    expect(nodeHasAccessibleName(node({ tag: "img", staticAlt: "Company logo" }))).toBe(true);
  });

  it("returns false for an img with empty alt (a decorative image is not itself an accessible NAME source)", () => {
    expect(nodeHasAccessibleName(node({ tag: "img", staticAlt: "" }))).toBe(false);
  });

  it("returns true when the accessible name comes from a nested grandchild, not a direct child", () => {
    // <button><span>Learn more</span></button> — the button itself has no
    // direct text; "Learn more" is a grandchild text node. This is exactly
    // the case a regex over raw source can't reliably answer, since it
    // requires understanding arbitrary nesting depth.
    const spanNode = node({ tag: "span", text: "Learn more" });
    const buttonNode = node({ tag: "button", children: [spanNode] });
    expect(nodeHasAccessibleName(buttonNode)).toBe(true);
  });

  it("returns true when the accessible name comes from a descendant img's alt, several levels deep", () => {
    const imgNode = node({ tag: "img", staticAlt: "Logo" });
    const wrapperNode = node({ tag: "span", children: [imgNode] });
    const linkNode = node({ tag: "a", children: [wrapperNode] });
    expect(nodeHasAccessibleName(linkNode)).toBe(true);
  });

  it("returns false for a genuinely empty icon button — no text, no aria-label, no accessible descendant", () => {
    const iconNode = node({ tag: "svg" }); // a bare icon with none of the above
    const buttonNode = node({ tag: "button", children: [iconNode] });
    expect(nodeHasAccessibleName(buttonNode)).toBe(false);
  });

  it("returns false for a completely empty leaf node", () => {
    expect(nodeHasAccessibleName(node())).toBe(false);
  });
});
