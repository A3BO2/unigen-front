import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import styled from 'styled-components';

const SeniorLogin = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [step, setStep] = useState('phone'); // phone, code
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const handleSendCode = () => {
    if (phoneNumber.length >= 10) {
      // 실제로는 백엔드에 인증번호 요청
      setStep('code');
    }
  };

  const handleVerify = () => {
    // 실제로는 백엔드에서 검증
    if (verificationCode.length === 6) {
      login({
        id: phoneNumber,
        name: '사용자',
        phone: phoneNumber,
      }, 'senior');
      navigate('/senior/home');
    }
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/')}>
          ← 뒤로
        </BackButton>
      </Header>

      <Content>
        <Title>간단하게 시작하기</Title>

        {step === 'phone' ? (
          <>
            <Description>
              전화번호만 입력하시면
              <br />
              바로 시작할 수 있어요
            </Description>

            <InputContainer>
              <Label>전화번호</Label>
              <Input
                type="tel"
                placeholder="010-1234-5678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoFocus
              />
            </InputContainer>

            <Button onClick={handleSendCode} disabled={phoneNumber.length < 10}>
              인증번호 받기
            </Button>
          </>
        ) : (
          <>
            <Description>
              문자로 받은 인증번호를
              <br />
              입력해주세요
            </Description>

            <PhoneDisplay>{phoneNumber}</PhoneDisplay>

            <InputContainer>
              <Label>인증번호 (6자리)</Label>
              <Input
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                maxLength={6}
                autoFocus
              />
            </InputContainer>

            <Button onClick={handleVerify} disabled={verificationCode.length !== 6}>
              시작하기
            </Button>

            <ResendButton onClick={() => setStep('phone')}>
              전화번호 다시 입력
            </ResendButton>
          </>
        )}

        <TermsText>
          계속 진행하시면 <TermsLink>이용약관</TermsLink>에 동의하는 것으로 간주됩니다
        </TermsText>
      </Content>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: #ffffff;
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.div`
  margin-bottom: 40px;
`;

const BackButton = styled.button`
  font-size: 24px;
  font-weight: 600;
  color: #333;
  padding: 12px;

  &:hover {
    opacity: 0.7;
  }
`;

const Content = styled.div`
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: #000;
  margin-bottom: 16px;
`;

const Description = styled.p`
  font-size: 22px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 48px;
`;

const InputContainer = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
`;

const Input = styled.input`
  width: 100%;
  font-size: 24px;
  padding: 20px;
  border: 3px solid #ddd;
  border-radius: 12px;
  transition: border-color 0.2s;

  &:focus {
    border-color: #667eea;
  }

  &::placeholder {
    color: #aaa;
  }
`;

const Button = styled.button`
  width: 100%;
  font-size: 22px;
  font-weight: 600;
  color: white;
  background: ${props => props.disabled ? '#ccc' : '#667eea'};
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;

  &:hover {
    background: ${props => props.disabled ? '#ccc' : '#5568d3'};
  }

  &:active {
    transform: ${props => props.disabled ? 'none' : 'scale(0.98)'};
  }
`;

const PhoneDisplay = styled.div`
  font-size: 20px;
  color: #667eea;
  font-weight: 600;
  margin-bottom: 24px;
  text-align: center;
`;

const ResendButton = styled.button`
  font-size: 18px;
  color: #667eea;
  text-decoration: underline;
  margin-bottom: 24px;

  &:hover {
    opacity: 0.7;
  }
`;

const TermsText = styled.p`
  font-size: 16px;
  color: #999;
  text-align: center;
  margin-top: 24px;
`;

const TermsLink = styled.span`
  color: #667eea;
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    opacity: 0.7;
  }
`;

export default SeniorLogin;
