export function getUserId() {
  const userId = document
    .querySelector("[data-userid]")
    ?.getAttribute("data-userid")
  return userId
}
