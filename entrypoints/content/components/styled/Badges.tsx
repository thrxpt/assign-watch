import styled from "styled-components"

const getStatusColor = (type: string) => {
  const colors = {
    submitted: "#4caf50",
    notSubmitted: "#f44336",
    assignment: "#fd7e14",
    quiz: "#17a2b8",
    individual: "#6c757d",
    group: "#6c757d",
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
  font-weight: 500;
  color: white;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  opacity: 0.9;
  transition: opacity 0.2s ease;
  background-color: ${(props) => getStatusColor(props.$type)};
`
