import styled from "styled-components"

export const ViewToggleButton = styled.button<{ active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ active, theme }) =>
    active ? theme.primary : theme.background};
  color: ${({ active, theme }) =>
    active ? theme.background : theme.textMuted};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: -1px;

  &:first-of-type {
    border-top-left-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    margin-left: 0;
  }

  &:last-of-type {
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
  }

  &:hover {
    background: ${({ active, theme }) =>
      active ? theme.primary : theme.hover};
  }
`

export const ThemeToggleButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.25rem;
`
