import type { ClassInfo } from "@/types";

export function scrapeUserId() {
  const userId = document
    .querySelector("[data-userid]")
    ?.getAttribute("data-userid");
  return userId;
}

export function scrapeClassCards() {
  const classCards = document.querySelectorAll(".class-card");
  const classTextElements = document.querySelectorAll(
    "#font-color-main-card p"
  );
  const classesInfo: ClassInfo[] = [];

  for (let i = 0; i < classCards.length; i++) {
    const cardName = classCards[i].getAttribute("name");
    const classId = cardName?.split("-")[1];
    if (!classId) {
      continue;
    }

    const cardElement = classCards[i];
    const nextElement = cardElement.nextElementSibling;

    if (nextElement?.tagName === "UL") {
      const settingsIcon = nextElement.querySelector(
        "li > div > div.icon-setting-2.fix-oncard-btn"
      );
      if (settingsIcon) {
        continue;
      }
    }

    const classTitle = classTextElements[i * 2].textContent;
    const classDescription = classTextElements[i * 2 + 1].textContent;

    const cardFooter = cardElement.querySelector(
      "div.card-block.card-footer.flex-container.f-jc-sb.f-ai-c"
    );
    const classSection =
      cardFooter?.querySelector("span:nth-child(1) > p.h5")?.textContent ?? "";
    const classSemester =
      cardFooter?.querySelector("span:nth-child(2) > p.h5")?.textContent ?? "";

    classesInfo.push({
      id: Number(classId),
      title: classTitle,
      description: classDescription,
      section: classSection,
      semester: classSemester,
    });
  }
  return classesInfo;
}
