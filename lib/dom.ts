import type { ClassInfo } from "@/types";

const CLASS_ID_PATTERN = /^[0-9]+$/u;
const TA_SETTINGS_ICON = "li > div > div.icon-setting-2.fix-oncard-btn";
const CARD_TEXT_BLOCK = "#font-color-main-card";
const CARD_TEXT = `${CARD_TEXT_BLOCK} p`;
const CARD_FOOTER = "div.card-block.card-footer.flex-container.f-jc-sb.f-ai-c";

export type ClassScrape =
  | { classes: ClassInfo[]; status: "resolved" }
  | { status: "unresolved" };

const UNRESOLVED: ClassScrape = { status: "unresolved" };

export function scrapeUserId() {
  const userId =
    document.querySelector<HTMLElement>("[data-userid]")?.dataset.userid;
  return userId;
}

/** The trimmed student ID the page currently identifies, or null if none. */
export function readCurrentStudentId(): string | null {
  const userId = scrapeUserId()?.trim();
  return userId || null;
}

function readClassId(card: Element): number | null {
  const rawId = card.getAttribute("name")?.split("-")[1];
  if (!(rawId && CLASS_ID_PATTERN.test(rawId))) {
    return null;
  }
  const id = Number(rawId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isTeachingAssistantCard(card: Element): boolean {
  const nextElement = card.nextElementSibling;
  return (
    nextElement?.tagName === "UL" &&
    nextElement.querySelector(TA_SETTINGS_ICON) !== null
  );
}

/**
 * The title and description paragraphs for one card: inside the card when the
 * card is itself a text block or holds one, otherwise in its immediate wrapper
 * when that wrapper holds exactly this one card and exactly one text block (the
 * card, an optional TA marker list, and the text block as siblings).
 * Document-level parents and wrappers shared by several cards are never
 * searched.
 */
function findCardText(card: Element): Element[] {
  if (
    card.matches(CARD_TEXT_BLOCK) ||
    card.querySelector(CARD_TEXT_BLOCK) !== null
  ) {
    return [...card.querySelectorAll(CARD_TEXT)];
  }

  const wrapper = card.parentElement;
  if (
    wrapper === null ||
    wrapper === document.body ||
    wrapper === document.documentElement ||
    wrapper.querySelectorAll(".class-card").length !== 1 ||
    wrapper.querySelectorAll(CARD_TEXT_BLOCK).length !== 1
  ) {
    return [];
  }
  return [...wrapper.querySelectorAll(CARD_TEXT)];
}

function readClassCard(card: Element): ClassInfo | null {
  const id = readClassId(card);
  if (id === null) {
    return null;
  }

  // Read text local to this card only, never by position across the page.
  const [titleElement, descriptionElement] = findCardText(card);
  const title = titleElement?.textContent;
  if (!title?.trim() || descriptionElement === undefined) {
    return null;
  }

  const cardFooter = card.querySelector(CARD_FOOTER);
  return {
    description: descriptionElement.textContent ?? "",
    id,
    section:
      cardFooter?.querySelector("span:nth-child(1) > p.h5")?.textContent ?? "",
    semester:
      cardFooter?.querySelector("span:nth-child(2) > p.h5")?.textContent ?? "",
    title,
  };
}

/**
 * Reads the enrolled classes from `/class`. A result is resolved only when at
 * least one student card exists and every student card is complete; anything
 * else is unresolved, because unfinished markup cannot prove the enrollment.
 */
export function scrapeClassCards(): ClassScrape {
  const classes = new Map<number, ClassInfo>();

  for (const card of document.querySelectorAll(".class-card")) {
    if (isTeachingAssistantCard(card)) {
      continue;
    }

    const classInfo = readClassCard(card);
    if (classInfo === null) {
      return UNRESOLVED;
    }
    if (!classes.has(classInfo.id)) {
      classes.set(classInfo.id, classInfo);
    }
  }

  return classes.size > 0
    ? { classes: [...classes.values()], status: "resolved" }
    : UNRESOLVED;
}
