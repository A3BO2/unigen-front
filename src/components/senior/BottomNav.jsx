import { useNavigate, useLocation } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import { useApp } from '../../context/AppContext';

const SeniorBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useApp();

  const isActive = (path) => location.pathname === path;

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container>
        <NavItem onClick={() => navigate('/senior/home')} $active={isActive('/senior/home')}>
          <Label>홈</Label>
        </NavItem>
        <NavItem onClick={() => navigate('/senior/write')} $active={isActive('/senior/write')}>
          <Label>글쓰기</Label>
        </NavItem>
        <NavItem onClick={() => navigate('/senior/profile')} $active={isActive('/senior/profile')}>
          <Label>내 정보</Label>
        </NavItem>
      </Container>
    </ThemeProvider>
  );
};

const Container = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.theme.$darkMode ? '#000' : '#fff'};
  border-top: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  display: flex;
  justify-content: space-around;
  padding: 16px 0 20px;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);

  @media (min-width: 768px) {
    max-width: 600px;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
  }
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  color: ${props => props.$active ? (props.theme.$darkMode ? '#fff' : '#000') : '#999'};
  transition: all 0.2s;
  border-radius: 16px;
  min-width: 100px;
  min-height: 56px;

  &:active {
    transform: scale(0.92);
    background: ${props => props.$active ? (props.theme.$darkMode ? '#1a1a1a' : '#f0f0f0') : (props.theme.$darkMode ? '#0a0a0a' : '#f5f5f5')};
  }

  ${props => props.$active && `
    background: ${props.theme.$darkMode ? '#1a1a1a' : '#f0f0f0'};
  `}
`;

const Label = styled.span`
  font-size: 22px;
  font-weight: 700;
`;

export default SeniorBottomNav;
