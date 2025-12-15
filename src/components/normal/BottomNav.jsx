import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Home, Search, PlusSquare, Film, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useApp();

  const isActive = (path) => location.pathname === path;

  return (
    <Container $darkMode={isDarkMode}>
      <NavItem onClick={() => navigate('/normal/home')} $active={isActive('/normal/home')} $darkMode={isDarkMode}>
        <Home
          size={24}
          strokeWidth={isActive('/normal/home') ? 2.5 : 2}
          fill={isActive('/normal/home') ? (isDarkMode ? '#fff' : '#262626') : 'none'}
          color={isDarkMode ? '#fff' : '#262626'}
        />
      </NavItem>
      <NavItem onClick={() => navigate('/normal/search')} $active={isActive('/normal/search')} $darkMode={isDarkMode}>
        <Search
          size={24}
          strokeWidth={isActive('/normal/search') ? 2.5 : 2}
          color={isDarkMode ? '#fff' : '#262626'}
        />
      </NavItem>
      <NavItem onClick={() => navigate('/normal/upload')} $active={isActive('/normal/upload')} $darkMode={isDarkMode}>
        <PlusSquare
          size={24}
          strokeWidth={2}
          color={isDarkMode ? '#fff' : '#262626'}
        />
      </NavItem>
      <NavItem onClick={() => navigate('/normal/reels')} $active={isActive('/normal/reels')} $darkMode={isDarkMode}>
        <Film
          size={24}
          strokeWidth={isActive('/normal/reels') ? 2.5 : 2}
          color={isDarkMode ? '#fff' : '#262626'}
        />
      </NavItem>
      <NavItem onClick={() => navigate('/normal/profile')} $active={isActive('/normal/profile')} $darkMode={isDarkMode}>
        <ProfileIcon $active={isActive('/normal/profile')} $darkMode={isDarkMode}>
          <User size={20} color={isDarkMode ? '#fff' : '#262626'} />
        </ProfileIcon>
      </NavItem>
    </Container>
  );
};

const Container = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.$darkMode ? '#000' : 'white'};
  border-top: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  display: none;
  justify-content: space-around;
  align-items: center;
  padding: 8px 0 12px;
  z-index: 100;

  @media (max-width: 767px) {
    display: flex;
  }
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  cursor: pointer;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.9);
  }
`;

const ProfileIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: ${props => props.$active ? `2px solid ${props.$darkMode ? '#fff' : '#262626'}` : 'none'};
  padding: ${props => props.$active ? '2px' : '0'};
`;

export default BottomNav;
