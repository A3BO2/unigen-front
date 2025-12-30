import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import styled from "styled-components";
import { Mail } from "lucide-react";

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useApp();
  const [verificationCode, setVerificationCode] = useState("");
  const [isResent, setIsResent] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isExpired, setIsExpired] = useState(false);

  // 이전 페이지에서 전달받은 이메일과 사용자 정보
  const userEmail = location.state?.email || "";
  const userInfo = location.state?.userInfo || {};

  useEffect(() => {
    if (countdown > 0 && !isExpired) {
      const timer = setTimeout(() => {
        setCountdown((prev) => {
          const newCountdown = prev - 1;
          if (newCountdown === 0) {
            setIsExpired(true);
          }
          return newCountdown;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, isExpired]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (verificationCode.length !== 6) {
      alert("인증번호 6자리를 입력해주세요.");
      return;
    }

    if (isExpired) {
      alert("인증번호가 만료되었습니다. 재전송해주세요.");
      return;
    }

    // 실제로는 서버에서 인증번호 확인
    // 여기서는 데모를 위해 바로 로그인 처리
    await login(userInfo, "normal");
    navigate("/normal/home");
  };

  const handleResend = () => {
    // 실제로는 서버에 재전송 요청
    setIsResent(true);
    setCountdown(60);
    setIsExpired(false);
    setTimeout(() => setIsResent(false), 3000);
  };

  const handleChangeEmail = () => {
    navigate("/login/normal?mode=signup");
  };

  return (
    <Container>
      <FormContainer>
        <IconWrapper>
          <MailIcon>
            <Mail size={48} strokeWidth={1.5} />
          </MailIcon>
        </IconWrapper>

        <Title>이메일 인증</Title>

        <Description>
          <strong>{userEmail}</strong>(으)로
          <br />
          인증번호를 보내드렸습니다.
        </Description>

        <Form onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder="인증번호 6자리"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (value.length <= 6) {
                setVerificationCode(value);
              }
            }}
            maxLength={6}
            required
          />

          {!isExpired && (
            <Timer expired={countdown < 30}>
              {Math.floor(countdown / 60)}:
              {String(countdown % 60).padStart(2, "0")}
            </Timer>
          )}

          {isExpired && (
            <ExpiredMessage>인증번호가 만료되었습니다</ExpiredMessage>
          )}

          <SubmitButton type="submit" disabled={isExpired}>
            인증 확인
          </SubmitButton>
        </Form>

        <LinkSection>
          <ResendButton onClick={handleResend}>
            {isResent ? "인증번호를 다시 보냈습니다" : "인증번호 재전송"}
          </ResendButton>

          <Divider>·</Divider>

          <ChangeEmailButton onClick={handleChangeEmail}>
            이메일 변경
          </ChangeEmailButton>
        </LinkSection>
      </FormContainer>

      <BackToLogin onClick={() => navigate("/login/normal")}>
        로그인으로 돌아가기
      </BackToLogin>
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

  @media (max-width: 767px) {
    min-height: 100vh;
    min-height: 100dvh;
    height: 100vh;
    height: 100dvh;
    padding: 16px;
    box-sizing: border-box;
  }
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 350px;
  background: white;
  border: 1px solid #dbdbdb;
  padding: 40px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (max-width: 450px) {
    background: transparent;
    border: none;
    padding: 20px;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
`;

const MailIcon = styled.div`
  width: 80px;
  height: 80px;
  border: 3px solid #262626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #262626;
`;

const Title = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16px;
  text-align: center;
`;

const Description = styled.p`
  font-size: 14px;
  color: #8e8e8e;
  text-align: center;
  line-height: 1.5;
  margin-bottom: 24px;

  strong {
    color: #262626;
    font-weight: 600;
  }
`;

const Form = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 9px 8px;
  font-size: 14px;
  color: #262626;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  border-radius: 3px;
  text-align: center;
  letter-spacing: 8px;
  font-weight: 600;

  &:focus {
    border-color: #a8a8a8;
  }

  &::placeholder {
    color: #8e8e8e;
    letter-spacing: normal;
  }
`;

const Timer = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${(props) => (props.expired ? "#ed4956" : "#0095f6")};
  font-weight: 600;
  margin-top: 4px;
`;

const ExpiredMessage = styled.div`
  text-align: center;
  font-size: 12px;
  color: #ed4956;
  font-weight: 600;
  margin-top: 4px;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 7px 16px;
  background: ${(props) => (props.disabled ? "#b2dffc" : "#0095f6")};
  color: white;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  margin-top: 8px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: background 0.2s;

  &:hover {
    background: ${(props) => (props.disabled ? "#b2dffc" : "#1877f2")};
  }

  &:active {
    opacity: ${(props) => (props.disabled ? 1 : 0.7)};
  }
`;

const LinkSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
`;

const ResendButton = styled.button`
  font-size: 12px;
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.7;
  }
`;

const Divider = styled.span`
  color: #dbdbdb;
  font-size: 12px;
`;

const ChangeEmailButton = styled.button`
  font-size: 12px;
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.7;
  }
`;

const BackToLogin = styled.button`
  width: 100%;
  max-width: 350px;
  padding: 14px;
  background: white;
  border: 1px solid #dbdbdb;
  font-size: 14px;
  color: #262626;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }

  @media (max-width: 450px) {
    background: transparent;
    border: none;
  }
`;

export default EmailVerification;
