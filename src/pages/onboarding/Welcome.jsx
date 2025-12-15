import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Smartphone, Zap } from 'lucide-react';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Content>
        <LogoSection>
          <LogoImage src="/unigen_black.png" alt="Unigen" />
          <Tagline>사진과 동영상을 공유하며<br />친구들과 소통하세요</Tagline>
        </LogoSection>

        <ButtonSection>
          <PrimaryButton onClick={() => navigate('/login/normal?mode=signup')}>
            새 계정 만들기
          </PrimaryButton>

          <Divider>
            <Line />
            <DividerText>또는</DividerText>
            <Line />
          </Divider>

          <ModeOptionsText>시니어 분들을 위한 간편 모드</ModeOptionsText>

          <SecondaryButton onClick={() => navigate('/login/senior')}>
            <IconWrapper>
              <Smartphone size={20} strokeWidth={2.5} />
            </IconWrapper>
            간단하게 시작하기
          </SecondaryButton>

          <FeatureList>
            <Feature>
              <Zap size={16} />
              <span>큰 글씨</span>
            </Feature>
            <Feature>
              <Zap size={16} />
              <span>쉬운 사용</span>
            </Feature>
            <Feature>
              <Zap size={16} />
              <span>음성 입력</span>
            </Feature>
          </FeatureList>
        </ButtonSection>
      </Content>

      <Footer>
        <FooterText>
          계정이 있으신가요?
          <LoginLink onClick={() => navigate('/login/normal')}> 로그인</LoginLink>
        </FooterText>
      </Footer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: #fafafa;
`;

const Content = styled.div`
  width: 100%;
  max-width: 350px;
  background: white;
  border: 1px solid #dbdbdb;
  padding: 40px 40px 20px;
  margin-bottom: 10px;

  @media (max-width: 450px) {
    background: transparent;
    border: none;
    padding: 20px;
  }
`;

const LogoSection = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const LogoImage = styled.img`
  height: 60px;
  margin-bottom: 16px;
`;

const Tagline = styled.p`
  font-size: 17px;
  font-weight: 600;
  color: #8e8e8e;
  line-height: 1.4;
`;

const ButtonSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  background: #0095f6;
  color: white;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #1877f2;
  }

  &:active {
    opacity: 0.7;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 20px 0;
`;

const Line = styled.div`
  flex: 1;
  height: 1px;
  background: #dbdbdb;
`;

const DividerText = styled.span`
  padding: 0 18px;
  color: #8e8e8e;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
`;

const ModeOptionsText = styled.div`
  text-align: center;
  font-size: 13px;
  color: #8e8e8e;
  margin: 16px 0 12px;
  font-weight: 600;
`;

const SecondaryButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  color: #0095f6;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: #f0f0f0;
  }

  &:active {
    opacity: 0.7;
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
`;

const FeatureList = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #efefef;
`;

const Feature = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #8e8e8e;

  svg {
    color: #0095f6;
  }
`;

const Footer = styled.div`
  width: 100%;
  max-width: 350px;
  background: white;
  border: 1px solid #dbdbdb;
  padding: 24px;
  text-align: center;

  @media (max-width: 450px) {
    background: transparent;
    border: none;
  }
`;

const FooterText = styled.div`
  font-size: 14px;
  color: #262626;
`;

const LoginLink = styled.span`
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

export default Welcome;
