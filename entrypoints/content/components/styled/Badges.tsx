import styled from "styled-components"

const getStatusColor = (type: string) => {
  const colors = {
    submitted: "#22c55e",
    notSubmitted: "#ef4444",
    assignment: "#f59e0b",
    quiz: "#06b6d4",
    individual: "#8b5cf6",
    group: "#ec4899",
  }

  switch (type) {
    case "submitted":
      return colors.submitted
    case "notSubmitted":
      return colors.notSubmitted
    case "ASM":
      return colors.assignment
    case "QUZ":
      return colors.quiz
    case "IND":
      return colors.individual
    case "STU":
      return colors.group
    default:
      return colors.individual
  }
}

export const StatusBadge = styled.span<{ $type: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  color: white;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  opacity: 0.9;
  transition: opacity 0.2s ease;
  background-color: ${(props) => getStatusColor(props.$type)};
`
