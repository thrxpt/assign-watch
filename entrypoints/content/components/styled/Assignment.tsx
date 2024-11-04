import styled from "styled-components"

import { slideIn } from "@/entrypoints/content/components/animations"

export const AssignmentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

export const AssignmentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

export const AssignmentItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: ${({ theme }) => theme.background};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.75rem;
  transition: box-shadow 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  animation: ${slideIn} 0.3s ease-out;

  .assignment-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: ${({ theme }) => theme.text};
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;

    span {
      font-size: 1.25rem;
    }

    svg {
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    &:hover {
      text-decoration: underline;
      svg {
        opacity: 1;
      }
    }
  }

  .status-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`
