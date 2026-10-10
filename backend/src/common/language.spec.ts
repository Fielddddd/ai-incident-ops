import { detectLanguage, languageInstruction } from "./language.js";

describe("detectLanguage", () => {
  it("returns Thai when the text has any Thai character", () => {
    expect(detectLanguage("connection pool ของ database เต็ม")).toBe("Thai");
    expect(detectLanguage("ก")).toBe("Thai");
  });

  it("returns English for Latin-only text", () => {
    expect(detectLanguage("Database connection pool exhaustion")).toBe("English");
  });

  it("defaults to English for empty or symbol-only text", () => {
    expect(detectLanguage("")).toBe("English");
    expect(detectLanguage("503 !!! ???")).toBe("English");
  });
});

describe("languageInstruction", () => {
  it("names the language explicitly", () => {
    expect(languageInstruction("Thai")).toContain("in Thai");
    expect(languageInstruction("English")).toContain("in English");
  });
});
