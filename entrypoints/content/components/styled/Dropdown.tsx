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
  width: 200px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
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
