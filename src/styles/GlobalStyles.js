import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    --font-scale: ${props => {
      const scaleMap = {
        small: 0.85,
        medium: 1,
        large: 1.25
      };
      return scaleMap[props.$fontScale] || 1;
    }};
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${props => {
      if (props.$isSeniorMode) {
        return props.$isDarkMode ? '#000000' : '#f6f6f6';
      }
      return '#fafafa';
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
`;
