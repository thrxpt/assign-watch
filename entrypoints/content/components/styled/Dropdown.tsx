import styled from "styled-components"

export const DropdownButton = styled.button`
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.375rem;
  background: ${({ theme }) => theme.background};
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
  font-size: 1.125rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.hover};
  }
`

export const DropdownContent = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  background: ${({ theme }) => theme.background};
  border: 1px solid ${({ theme }) => theme.border};
  margin-top: 0.5rem;
  border-radius: 0.375rem;
  width: 250px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.05),
    0 4px 6px -4px rgba(0, 0, 0, 0.05);
`

export const DropdownItem = styled.label`
  margin: 0;
  display: block;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  &:last-child {
    border-bottom: none;
  }

  input {
    margin-right: 0.5rem;
  }
`

export const DropdownLabel = styled.div`
  padding: 0.5rem 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.875rem;
  background-color: ${({ theme }) => theme.cardBg};
  border-bottom: 1px solid ${({ theme }) => theme.border};
`

export const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  margin-bottom: 0.5rem;
`

export const TabButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 0.5rem;
  background: ${({ active, theme }) => (active ? theme.cardBg : "transparent")};
  color: ${({ active, theme }) => (active ? theme.text : theme.textMuted)};
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.hover};
    color: ${({ theme }) => theme.text};
  }

  &:first-child {
    border-top-left-radius: 0.375rem;
  }

  &:last-child {
    border-top-right-radius: 0.375rem;
  }
`
