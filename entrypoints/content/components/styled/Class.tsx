import styled from "styled-components"

import { slideIn } from "@/entrypoints/content/components/animations"

export const ClassContainer = styled.div<{ $isGrid: boolean }>`
  display: ${(props) => (props.$isGrid ? "grid" : "flex")};
  grid-template-columns: repeat(2, 1fr);
  flex-direction: column;
  gap: 1rem;
`

export const ClassCard = styled.div`
  position: relative;
  padding: 1.25rem;
  background-color: ${({ theme }) => theme.cardBg};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 1rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: ${slideIn} 0.3s ease-out;

  .class-card-header {
    display: flex;
    justify-content: baseline;
    align-items: first baseline;
    gap: 0.5rem;
    margin-bottom: 0.75rem;

    h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: ${({ theme }) => theme.text};
      line-height: 1.2;
      white-space: nowrap;

      a:hover {
        text-decoration: underline;
      }
    }

    p {
      color: ${({ theme }) => theme.textMuted};
      line-height: 1.5;
      font-size: 1rem;
      margin: 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
    }
  }
`
