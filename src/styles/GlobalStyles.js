import { createGlobalStyle } from "styled-components";

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    --font-scale: ${(props) => {
      const scaleMap = {
        small: 0.85,
        medium: 1,
        large: 1.25,
      };
      return scaleMap[props.$fontScale] || 1;
    }};

    /* 반응형 유틸 변수 */
    --container-padding: 2rem;
    --gap-sm: 8px;
    --gap-md: 16px;
    --gap-lg: 24px;
  }

  /* 반응형 폰트 스케일링 */
  @media (max-width: 767px) {
    :root {
      --container-padding: 12px;
      --font-scale: ${(props) => {
        const scaleMap = { small: 0.85, medium: 0.95, large: 1.1 };
        return scaleMap[props.$fontScale] || 0.95;
      }};
    }

    /* 모바일에서 하단 네비(약 60px) 때문에 콘텐츠가 가려지지 않도록 기본 바텀 패딩 추가 */
    body { padding-bottom: 78px; }
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${(props) => {
      if (props.$isSeniorMode) {
        return props.$isDarkMode ? "#000000" : "#f6f6f6";
      }
      return "#fafafa";
    }};
    font-size: calc(16px * var(--font-scale, 1));
  }

  #root {
    width: 100%;
    min-height: 100vh;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  img, video {
    max-width: 100%;
    height: auto;
    display: block;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
  }

  input, textarea {
    font-family: inherit;
    border: none;
    outline: none;
  }

  /* 터치 친화성: 모바일에서 버튼 최소 높이 보장 */
  @media (max-width: 767px) {
    button { min-height: 44px; }
  }
`;
