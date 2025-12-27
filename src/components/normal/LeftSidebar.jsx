import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Home, Search, Compass, Film, PlusSquare, User, Menu, X, Settings, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { logoutWithKakao } from '../../utils/kakaoAuth';

const LeftSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode, logout, user } = useApp();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleMoreToggle = () => {
    setIsMoreOpen(!isMoreOpen);
    setIsSearchOpen(false);
  };

  const menuItems = [
    { icon: Home, label: '홈', path: '/normal/home', action: () => { setIsSearchOpen(false); setIsMoreOpen(false); navigate('/normal/home'); } },
    { icon: Search, label: '검색', path: '/normal/search', action: () => { setIsSearchOpen(false); setIsMoreOpen(false); navigate('/normal/search'); } },
    { icon: Compass, label: '탐색 탭', path: '/normal/explore', action: () => { setIsSearchOpen(false); setIsMoreOpen(false); navigate('/normal/explore'); } },
    { icon: Film, label: '릴스', path: '/normal/reels', action: () => { setIsSearchOpen(false); setIsMoreOpen(false); navigate('/normal/reels'); } },
    { icon: PlusSquare, label: '만들기', path: '/normal/upload', action: () => { setIsSearchOpen(false); setIsMoreOpen(false); navigate('/normal/upload'); } },
    { icon: User, label: '프로필', path: '/normal/profile', action: () => { setIsSearchOpen(false); setIsMoreOpen(false); navigate('/normal/profile'); } },
  ];

  return (
    <>
      <Container $collapsed={isSearchOpen} $darkMode={isDarkMode}>
        <Logo onClick={() => navigate('/normal/home')} $collapsed={isSearchOpen}>
          <LogoImage src={isDarkMode ? "/unigen_white.png" : "/unigen_black.png"} alt="Unigen" $collapsed={isSearchOpen} />
        </Logo>

        <Nav>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.path ? location.pathname === item.path : isSearchOpen && item.icon === Search;

            return (
              <NavItem
                key={index}
                onClick={item.action}
                $active={isActive}
                $darkMode={isDarkMode}
              >
                <Icon
                  size={26}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive && item.icon === Home ? (isDarkMode ? '#fff' : '#262626') : 'none'}
                  color={isDarkMode ? '#fff' : '#262626'}
                />
                <NavLabel $active={isActive} $collapsed={isSearchOpen} $darkMode={isDarkMode}>{item.label}</NavLabel>
              </NavItem>
            );
          })}
        </Nav>

        <MoreButton onClick={handleMoreToggle} $darkMode={isDarkMode}>
          <Menu size={26} color={isDarkMode ? '#fff' : '#262626'} />
          <NavLabel $collapsed={isSearchOpen} $darkMode={isDarkMode}>더보기</NavLabel>
        </MoreButton>
      </Container>

      {isMoreOpen && (
        <MorePanel $darkMode={isDarkMode}>
          <MoreContent>
            <MoreMenuItem onClick={() => navigate('/normal/settings')} $darkMode={isDarkMode}>
              <Settings size={24} color={isDarkMode ? '#fff' : '#262626'} />
              <MoreMenuLabel $darkMode={isDarkMode}>설정</MoreMenuLabel>
            </MoreMenuItem>

            <MoreMenuItem onClick={toggleDarkMode} $darkMode={isDarkMode}>
              {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
              <MoreMenuLabel $darkMode={isDarkMode}>모드 전환</MoreMenuLabel>
            </MoreMenuItem>

            <MoreMenuItem 
              onClick={() => {
                if (confirm('로그아웃 하시겠습니까?')) {
                  // 카카오 로그인을 사용한 경우 카카오 로그아웃도 처리
                  if (user?.signup_mode === 'kakao') {
                    logoutWithKakao();
                  }
                  logout();
                  navigate('/');
                }
              }} 
              $darkMode={isDarkMode}
            >
              <MoreMenuLabel $darkMode={isDarkMode}>로그아웃</MoreMenuLabel>
            </MoreMenuItem>
          </MoreContent>
        </MorePanel>
      )}
    </>
  );
};

const Container = styled.aside`
  position: fixed;
  left: 0;
  top: 0;
  width: ${props => props.$collapsed ? '72px' : '335px'};
  height: 100vh;
  background: ${props => props.$darkMode ? '#000' : 'white'};
  border-right: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  padding: 8px 12px 20px;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: width 0.3s ease;

  @media (max-width: 1264px) {
    width: 72px;
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

const Logo = styled.div`
  padding: ${props => props.$collapsed ? '25px 0 16px' : '25px 12px 16px'};
  margin-bottom: 10px;
  cursor: pointer;
  display: flex;
  justify-content: ${props => props.$collapsed ? 'center' : 'flex-start'};

  @media (max-width: 1264px) {
    padding: 25px 0 16px;
    justify-content: center;
  }
`;

const LogoImage = styled.img`
  height: ${props => props.$collapsed ? '24px' : '29px'};
  transition: height 0.3s ease;

  @media (max-width: 1264px) {
    height: 24px;
  }
`;

const Nav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: ${props => props.$active ? '700' : '400'};
  background: ${props => props.$active ? (props.$darkMode ? '#1a1a1a' : '#fafafa') : 'transparent'};
  position: relative;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};

  &:hover {
    background: ${props => props.$darkMode ? '#1a1a1a' : '#fafafa'};
  }

  &:active {
    transform: scale(0.95);
    background: ${props => props.$darkMode ? '#262626' : '#efefef'};
  }

  svg {
    flex-shrink: 0;
  }

  @media (max-width: 1264px) {
    justify-content: center;
    padding: 12px;
  }
`;

const NavLabel = styled.span`
  font-size: 16px;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
  font-weight: ${props => props.$active ? '700' : '400'};
  display: ${props => props.$collapsed ? 'none' : 'inline'};

  @media (max-width: 1264px) {
    display: none;
  }
`;

const MoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};

  &:hover {
    background: ${props => props.$darkMode ? '#1a1a1a' : '#fafafa'};
  }

  &:active {
    transform: scale(0.95);
    background: ${props => props.$darkMode ? '#262626' : '#efefef'};
  }

  svg {
    flex-shrink: 0;
  }

  @media (max-width: 1264px) {
    justify-content: center;
  }
`;

const SearchPanel = styled.div`
  position: fixed;
  left: 72px;
  top: 0;
  width: 397px;
  height: 100vh;
  background: ${props => props.$darkMode ? '#000' : 'white'};
  border-right: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  z-index: 99;
  overflow-y: auto;
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

const SearchHeader = styled.div`
  padding: 24px 24px 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SearchTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
`;

const CloseButton = styled.button`
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$darkMode ? '#1a1a1a' : '#fafafa'};
  }

  &:active {
    transform: scale(0.9);
    background: ${props => props.$darkMode ? '#262626' : '#efefef'};
  }
`;

const SearchInput = styled.div`
  padding: 0 16px;
  margin-bottom: 24px;

  input {
    width: 100%;
    padding: 10px 16px;
    background: ${props => props.$darkMode ? '#262626' : '#efefef'};
    border-radius: 8px;
    font-size: 14px;
    color: ${props => props.$darkMode ? '#fff' : '#262626'};

    &::placeholder {
      color: #8e8e8e;
    }

    &:focus {
      outline: none;
      background: ${props => props.$darkMode ? '#1a1a1a' : '#e0e0e0'};
    }
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  margin-bottom: 12px;
`;

const RecentSection = styled.div`
  padding: 0 24px;
`;

const RecentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const RecentTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
`;

const ClearAllButton = styled.button`
  font-size: 14px;
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #00376b;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const NoRecentSearches = styled.div`
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  font-weight: 600;
  color: #8e8e8e;
`;




const MorePanel = styled.div`
  position: fixed;
  left: 12px;
  bottom: 90px;
  width: 266px;
  background: ${props => props.$darkMode ? '#262626' : 'white'};
  border: 1px solid ${props => props.$darkMode ? '#262626' : '#dbdbdb'};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 101;
  overflow: hidden;
  animation: slideUp 0.2s ease;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

const MoreHeader = styled.div`
  padding: 16px 16px 8px;
  border-bottom: 1px solid #dbdbdb;
`;

const MoreTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #262626;
`;

const MoreContent = styled.div`
  padding: 8px 0;
`;

const MoreMenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};

  &:hover {
    background: ${props => props.$darkMode ? '#1a1a1a' : '#fafafa'};
  }

  &:active {
    background: ${props => props.$darkMode ? '#000' : '#efefef'};
  }

  svg {
    flex-shrink: 0;
  }
`;

const MoreMenuLabel = styled.span`
  font-size: 14px;
  color: ${props => props.$darkMode ? '#fff' : '#262626'};
`;

const MoreDivider = styled.div`
  height: 1px;
  background: #dbdbdb;
  margin: 4px 0;
`;

export default LeftSidebar;
