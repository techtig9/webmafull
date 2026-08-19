import { describe, it, expect } from "vitest";
import {
  generateWebsiteSchema,
  followUpQuestionsSchema,
  formSubmitSchema,
  reorderSectionsSchema,
  saveProjectSchema,
  validate,
} from "@/lib/validation";

describe("generateWebsiteSchema", () => {
  it("accepts a valid request", () => {
    const result = validate(generateWebsiteSchema, {
      name: "Bloom & Co.",
      description: "A cozy neighborhood bakery in Lahore, warm and rustic.",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Bloom & Co.");
  });

  it("rejects an empty name", () => {
    const result = validate(generateWebsiteSchema, { name: "", description: "A long enough description." });
    expect(result.success).toBe(false);
  });

  it("rejects a description that's too short to be useful", () => {
    const result = validate(generateWebsiteSchema, { name: "Bloom", description: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing body entirely", () => {
    const result = validate(generateWebsiteSchema, null);
    expect(result.success).toBe(false);
  });

  it("defaults answers to an empty object when omitted", () => {
    const result = validate(generateWebsiteSchema, {
      name: "Bloom",
      description: "A cozy neighborhood bakery in Lahore.",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.answers).toEqual({});
  });

  it("rejects a non-uuid projectId instead of silently passing it through", () => {
    const result = validate(generateWebsiteSchema, {
      name: "Bloom",
      description: "A cozy neighborhood bakery in Lahore.",
      projectId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("followUpQuestionsSchema", () => {
  it("rejects when description is missing", () => {
    const result = validate(followUpQuestionsSchema, { name: "Bloom" });
    expect(result.success).toBe(false);
  });
});

describe("reorderSectionsSchema", () => {
  const projectId = "11111111-1111-4111-8111-111111111111";

  it("accepts a valid reorder request", () => {
    const result = validate(reorderSectionsSchema, {
      projectId,
      slug: "index",
      orderedSections: ["Footer", "Hero"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty orderedSections array", () => {
    const result = validate(reorderSectionsSchema, { projectId, slug: "index", orderedSections: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid projectId", () => {
    const result = validate(reorderSectionsSchema, {
      projectId: "not-a-uuid",
      slug: "index",
      orderedSections: ["Hero"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing slug", () => {
    const result = validate(reorderSectionsSchema, { projectId, orderedSections: ["Hero"] });
    expect(result.success).toBe(false);
  });
});

describe("saveProjectSchema", () => {
  const projectId = "11111111-1111-4111-8111-111111111111";

  it("accepts a request with files only (pages omitted)", () => {
    const result = validate(saveProjectSchema, { projectId, files: { "index.html": "<html></html>" } });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pages).toBeUndefined();
  });

  it("accepts a request that also carries pages", () => {
    const result = validate(saveProjectSchema, {
      projectId,
      files: {},
      pages: [{ slug: "index", path: "/", name: "Home", sections: ["Hero"] }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pages).toHaveLength(1);
  });

  it("rejects a missing files object", () => {
    const result = validate(saveProjectSchema, { projectId });
    expect(result.success).toBe(false);
  });
});

describe("formSubmitSchema", () => {
  const projectId = "11111111-1111-4111-8111-111111111111";

  it("accepts a minimal valid submission and defaults pageSlug/formName", () => {
    const result = validate(formSubmitSchema, { projectId, data: { email: "a@b.com" } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageSlug).toBe("index");
      expect(result.data.formName).toBe("contact");
    }
  });

  it("accepts an explicit pageSlug and formName", () => {
    const result = validate(formSubmitSchema, {
      projectId,
      pageSlug: "contact",
      formName: "newsletter",
      data: { email: "a@b.com" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageSlug).toBe("contact");
      expect(result.data.formName).toBe("newsletter");
    }
  });

  it("rejects more than 30 fields", () => {
    const data = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`field${i}`, "x"]));
    const result = validate(formSubmitSchema, { projectId, data });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 30 fields", () => {
    const data = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`field${i}`, "x"]));
    const result = validate(formSubmitSchema, { projectId, data });
    expect(result.success).toBe(true);
  });

  it("rejects a field value longer than 4000 characters", () => {
    const result = validate(formSubmitSchema, { projectId, data: { message: "x".repeat(4001) } });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid projectId", () => {
    const result = validate(formSubmitSchema, { projectId: "not-a-uuid", data: { email: "a@b.com" } });
    expect(result.success).toBe(false);
  });

  it("accepts the optional honeypot field", () => {
    const result = validate(formSubmitSchema, { projectId, data: { email: "a@b.com" }, website: "spam" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBe("spam");
  });
});
