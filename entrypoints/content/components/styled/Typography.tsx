import styled from "styled-components"

export const DueDate = styled.p`
  color: ${({ theme }) => theme.textMuted};
  font-size: 1.125rem;
`

export const NoAssignments = styled.div`
  color: ${({ theme }) => theme.textMuted};
  font-size: 1.125rem;
  margin: 0 auto;
  font-style: italic;
  text-align: center;
`
