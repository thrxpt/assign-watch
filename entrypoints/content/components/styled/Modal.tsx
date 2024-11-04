import styled from "styled-components"

import {
  fadeIn,
  fadeOut,
  scaleDownAndFadeOut,
  scaleUpAndFadeIn,
} from "@/entrypoints/content/components/animations"

export const ModalHeader = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 1rem;

  h1 {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 1.875rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text};
    margin: 0;
    white-space: nowrap;
  }

  p {
    color: ${({ theme }) => theme.textMuted};
    font-size: 1rem;
    margin: 0;
  }

  .settings-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
  }

  .view-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.875rem;
  }
`

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 50;
  animation: ${fadeIn} 0.2s ease-out;

  &.closing {
    animation: ${fadeOut} 0.2s ease-out forwards;
  }
`

export const ModalContent = styled.div<{ $isGrid: boolean }>`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  width: 90%;
  max-width: ${(props) => (props.$isGrid ? "64rem" : "38rem")};
  height: fit-content;
  max-height: 85vh;
  min-height: 50vh;
  margin: auto;
  background-color: ${({ theme }) => theme.background};
  padding: 1.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  border-radius: 1rem;
  z-index: 51;
  color: ${({ theme }) => theme.text};
  overflow-y: auto;
  transition:
    max-width 0.3s ease,
    height 0.3s ease;
  animation: ${scaleUpAndFadeIn} 0.3s ease-out;

  &.closing {
    animation: ${scaleDownAndFadeOut} 0.2s ease-out forwards;
  }
`
