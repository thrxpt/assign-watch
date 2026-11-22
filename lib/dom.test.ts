// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readCurrentStudentId, scrapeClassCards } from "@/lib/dom";

interface CardOptions {
  description?: string | null;
  isTeachingAssistant?: boolean;
  name?: string;
  title?: string | null;
}

function card({
  description = "About",
  isTeachingAssistant = false,
  name = "class-1",
  title = "Title",
}: CardOptions = {}) {
  const paragraphs = [title, description]
    .filter((text) => text !== null)
    .map((text) => `<p>${text}</p>`)
    .join("");
  const settingsIcon = isTeachingAssistant
    ? '<ul><li><div><div class="icon-setting-2 fix-oncard-btn"></div></div></li></ul>'
    : "<ul></ul>";
  return `
    <div class="card class-card" name="${name}">
      <div class="card-block" id="font-color-main-card">${paragraphs}</div>
      <div class="card-block card-footer flex-container f-jc-sb f-ai-c">
        <span><p class="h5">Sec 1</p></span>
        <span><p class="h5">1/2026</p></span>
      </div>
    </div>${settingsIcon}`;
}

function render(html: string) {
  document.body.innerHTML = html;
}

describe("scrapeClassCards", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("reads each student card relative to its own container", () => {
    render(`
      <div id="font-color-main-card"><p>Banner</p><p>Not a class</p></div>
      ${card({ description: "First", name: "class-11", title: "Alpha" })}
      ${card({ description: "Second", name: "class-22", title: "Beta" })}`);

    expect(scrapeClassCards()).toEqual({
      classes: [
        {
          description: "First",
          id: 11,
          section: "Sec 1",
          semester: "1/2026",
          title: "Alpha",
        },
        {
          description: "Second",
          id: 22,
          section: "Sec 1",
          semester: "1/2026",
          title: "Beta",
        },
      ],
      status: "resolved",
    });
  });

  it("excludes TA cards without reading them", () => {
    render(`
      ${card({ name: "class-1" })}
      ${card({ description: null, isTeachingAssistant: true, name: "class-2", title: null })}
      ${card({ name: "class-3" })}`);

    const scraped = scrapeClassCards();

    expect(scraped.status).toBe("resolved");
    expect(
      scraped.status === "resolved" && scraped.classes.map(({ id }) => id)
    ).toEqual([1, 3]);
  });

  it("keeps an empty description but drops duplicate class IDs", () => {
    render(`${card({ description: "" })}${card({ title: "Duplicate" })}`);

    const scraped = scrapeClassCards();

    expect(scraped.status === "resolved" && scraped.classes).toHaveLength(1);
    expect(
      scraped.status === "resolved" && scraped.classes[0].description
    ).toBe("");
  });

  it.each([
    ["a missing title", { description: null, title: null }],
    ["a missing description", { description: null }],
    ["a blank title", { title: "  " }],
    ["a missing ID", { name: "class" }],
    ["a non-numeric ID", { name: "class-abc" }],
    ["a zero ID", { name: "class-0" }],
    ["a negative ID", { name: "class--4" }],
    ["a decimal ID", { name: "class-1.5" }],
    ["an unsafe integer ID", { name: "class-9007199254740993" }],
  ] satisfies [string, CardOptions][])(
    "is unresolved for %s on a student card",
    (_name, options) => {
      render(`${card({ name: "class-5" })}${card(options)}`);
      expect(scrapeClassCards()).toEqual({ status: "unresolved" });
    }
  );

  it("reads a card whose text block is a sibling in its own wrapper", () => {
    render(
      '<section><div class="class-card" name="class-42"></div><ul></ul><div id="font-color-main-card"><p>Class 42</p><p>About 42</p></div></section>'
    );

    expect(scrapeClassCards()).toEqual({
      classes: [
        {
          description: "About 42",
          id: 42,
          section: "",
          semester: "",
          title: "Class 42",
        },
      ],
      status: "resolved",
    });
  });

  it("keeps the TA marker on the next sibling list in a shared wrapper", () => {
    render(
      '<section><div class="class-card" name="class-42"></div><ul><li><div><div class="icon-setting-2 fix-oncard-btn"></div></div></li></ul><div id="font-color-main-card"><p>Class 42</p><p>About 42</p></div></section>'
    );

    expect(scrapeClassCards()).toEqual({ status: "unresolved" });
  });

  it("is unresolved when a wrapper shared by two cards holds the text", () => {
    render(
      '<section><div class="class-card" name="class-1"></div><div class="class-card" name="class-2"></div><div id="font-color-main-card"><p>Class 1</p><p>About 1</p></div></section>'
    );
    expect(scrapeClassCards()).toEqual({ status: "unresolved" });
  });

  it("is unresolved when a wrapper holds several text blocks", () => {
    render(
      '<section><div class="class-card" name="class-1"></div><div id="font-color-main-card"><p>A</p><p>B</p></div><div id="font-color-main-card"><p>C</p><p>D</p></div></section>'
    );
    expect(scrapeClassCards()).toEqual({ status: "unresolved" });
  });

  it("never reads text from document-level parents", () => {
    render(
      '<div class="class-card" name="class-1"></div><div id="font-color-main-card"><p>Class 1</p><p>About 1</p></div>'
    );
    expect(scrapeClassCards()).toEqual({ status: "unresolved" });
  });

  it("is unresolved for a wrapper text block missing its description", () => {
    render(
      '<section><div class="class-card" name="class-1"></div><div id="font-color-main-card"><p>Class 1</p></div></section>'
    );
    expect(scrapeClassCards()).toEqual({ status: "unresolved" });
  });

  it("is unresolved when a card has no text container", () => {
    render(
      '<div class="card class-card" name="class-1"><div class="card-block"></div></div>'
    );
    expect(scrapeClassCards()).toEqual({ status: "unresolved" });
  });

  it("is unresolved without student cards, including TA-only pages", () => {
    render("");
    expect(scrapeClassCards()).toEqual({ status: "unresolved" });

    render(card({ isTeachingAssistant: true }));
    expect(scrapeClassCards()).toEqual({ status: "unresolved" });
  });
});

describe("readCurrentStudentId", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("trims the student ID and treats blank or absent IDs as none", () => {
    document.body.dataset.userid = " student-1 ";
    expect(readCurrentStudentId()).toBe("student-1");

    document.body.dataset.userid = "  ";
    expect(readCurrentStudentId()).toBeNull();

    delete document.body.dataset.userid;
    expect(readCurrentStudentId()).toBeNull();
  });
});
