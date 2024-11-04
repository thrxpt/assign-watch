export function getAllClassInfo() {
  const classCards = document.querySelectorAll(".class-card")
  const classTextElements = document.querySelectorAll("#font-color-main-card p")
  const classesInfo = []

  for (let i = 0; i < classCards.length; i++) {
    const cardName = classCards[i].getAttribute("name")
    const classId = cardName?.split("-")[1]
    if (!classId) continue
    const classTitle = classTextElements[i * 2].textContent
    const classDescription = classTextElements[i * 2 + 1].textContent

    classesInfo.push({
      id: classId,
      title: classTitle,
      description: classDescription,
    })
  }
  return classesInfo
}
