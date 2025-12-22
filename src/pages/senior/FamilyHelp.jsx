import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import SeniorBottomNav from '../../components/senior/BottomNav';

const generateCode = () => {
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `UG-${random}`;
};

const FamilyHelp = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useApp();
  const [qrReady, setQrReady] = useState(false);
  const [code, setCode] = useState(generateCode());

  const handleGenerate = () => {
    setCode(generateCode());
    setQrReady(true);
  };

  return (
    <ThemeProvider theme={{ $darkMode: isDarkMode }}>
      <Container>
        <Header>
          <BackButton onClick={() => navigate('/senior/profile')}>
            <ChevronLeft size={32} strokeWidth={2.5} />
          </BackButton>
          <Title>도우미 요청</Title>
          <Spacer />
        </Header>

        <Content>
          <IntroCard>
            <IntroTitle>가족이 QR 코드를 스캔하면 계정을 연결할 수 있어요</IntroTitle>
            <IntroText>
              휴대폰을 가족에게 보여주고 아래 버튼을 눌러 QR 코드를 만들어주세요.
            </IntroText>
            <IntroButton onClick={handleGenerate}>
              QR 코드 만들기
            </IntroButton>
          </IntroCard>

          {qrReady && (
            <QRSection>
              <QRBox>
                <QRCode>{code}</QRCode>
              </QRBox>
              <QRNote>이 코드는 5분 동안 사용할 수 있어요.</QRNote>
              <RefreshButton onClick={handleGenerate}>
                <RefreshCw size={20} />
                <span>새 코드 만들기</span>
              </RefreshButton>
            </QRSection>
          )}

          <Steps>
            <Step>
              <StepNumber>1</StepNumber>
              <StepText>가족이 QR 코드를 휴대폰으로 스캔합니다.</StepText>
            </Step>
            <Step>
              <StepNumber>2</StepNumber>
              <StepText>가족은 간단한 정보를 입력하고 연결을 승인합니다.</StepText>
            </Step>
            <Step>
              <StepNumber>3</StepNumber>
              <StepText>연결이 완료되면 설정을 도와줄 수 있어요.</StepText>
            </Step>
          </Steps>

          <WaitingCard>
            <WaitingTitle>가족이 연결할 때까지 기다려 주세요</WaitingTitle>
            <WaitingText>
              연결이 완료되면 알림으로 알려드릴게요. 잠시 후 다시 확인해주세요.
            </WaitingText>
          </WaitingCard>
        </Content>

        <SeniorBottomNav />
      </Container>
    </ThemeProvider>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.$darkMode ? '#000' : '#fff'};
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  padding-bottom: 80px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  background: ${props => props.theme.$darkMode ? '#000' : '#fff'};
  border-bottom: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  padding: 20px 24px;
  display: flex;
  align-items: center;
  z-index: 10;
`;

const BackButton = styled.button`
  color: inherit;
  padding: 4px;

  &:active {
    opacity: 0.6;
  }
`;

const Title = styled.h1`
  font-size: calc(32px * var(--font-scale, 1));
  font-weight: 700;
  flex: 1;
  text-align: center;
`;

const Spacer = styled.div`
  width: 40px;
`;

const Content = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const IntroCard = styled.div`
  padding: 24px;
  border-radius: 16px;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  text-align: center;
`;

const IntroTitle = styled.h2`
  font-size: calc(24px * var(--font-scale, 1));
  font-weight: 700;
  margin-bottom: 12px;
`;

const IntroText = styled.p`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#ddd' : '#555'};
  margin-bottom: 16px;
  line-height: 1.5;
`;

const IntroButton = styled.button`
  width: 100%;
  padding: 18px;
  border-radius: 12px;
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  background: #ffb703;
  color: #000;

  &:active {
    opacity: 0.85;
  }
`;

const QRSection = styled.div`
  padding: 24px;
  border-radius: 16px;
  border: 2px dashed ${props => props.theme.$darkMode ? '#4a4a4a' : '#d0d0d0'};
  text-align: center;
`;

const QRBox = styled.div`
  width: 220px;
  height: 220px;
  margin: 0 auto 16px;
  border-radius: 12px;
  background: repeating-linear-gradient(
    45deg,
    ${props => props.theme.$darkMode ? '#111' : '#fafafa'},
    ${props => props.theme.$darkMode ? '#111' : '#fafafa'} 10px,
    ${props => props.theme.$darkMode ? '#222' : '#eee'} 10px,
    ${props => props.theme.$darkMode ? '#222' : '#eee'} 20px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(36px * var(--font-scale, 1));
  font-weight: 700;
`;

const QRCode = styled.span`
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
`;

const QRNote = styled.p`
  font-size: calc(16px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#ccc' : '#666'};
  margin-bottom: 12px;
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 999px;
  font-size: calc(16px * var(--font-scale, 1));
  font-weight: 600;
  color: ${props => props.theme.$darkMode ? '#fff' : '#000'};
  border: 2px solid ${props => props.theme.$darkMode ? '#444' : '#ccc'};

  &:active {
    transform: scale(0.96);
  }
`;

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Step = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  background: ${props => props.theme.$darkMode ? '#1a1a1a' : '#f5f5f5'};
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
`;

const StepNumber = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #ffb703;
  color: #000;
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StepText = styled.p`
  font-size: calc(18px * var(--font-scale, 1));
  line-height: 1.4;
  flex: 1;
`;

const WaitingCard = styled.div`
  padding: 24px;
  border-radius: 16px;
  border: 2px solid ${props => props.theme.$darkMode ? '#2a2a2a' : '#e0e0e0'};
  background: ${props => props.theme.$darkMode ? '#0f0f0f' : '#fff8e1'};
`;

const WaitingTitle = styled.h3`
  font-size: calc(22px * var(--font-scale, 1));
  font-weight: 700;
  margin-bottom: 12px;
`;

const WaitingText = styled.p`
  font-size: calc(18px * var(--font-scale, 1));
  color: ${props => props.theme.$darkMode ? '#ddd' : '#555'};
  line-height: 1.5;
`;

export default FamilyHelp;
