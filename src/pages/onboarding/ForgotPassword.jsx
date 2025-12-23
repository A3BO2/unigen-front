import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Lock } from "lucide-react";
import { sendSmsCode, verifySmsCode } from "../../services/sms";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [authCode, setAuthCode] = useState();
  const [step, setStep] = useState("input_phone");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!phone) return alert("전화번호를 입력해주세요.");

    const cleanPhone = phone.replace(/-/g, "");
    if (cleanPhone.length < 10) return alert("올바른 전화번호를 입력해주세요.");

    setLoading(true);
    try {
      await sendSmsCode(cleanPhone);
      alert("인증 번호가 발송되었습니다.");
      setStep("input_code");
    } catch (error) {
      console.error(error);
      alert(error.message || "인증번호 발송에 실패하였습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!authCode) return alert("인증번호를 입력해주세요.");

    const cleanPhone = phone.replace(/-/g, "");
    setLoading(true);

    try {
      await verifySmsCode(cleanPhone, authCode);
      alert("인증 완료. 비밀번호를 재설정합니다.");
      navigate("/change-password", {
        state: { phone: cleanPhone },
      });
    } catch (error) {
      console.error(error);
      alert(error.message || "인증번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <FormContainer>
        <IconWrapper>
          <LockIcon>
            <Lock size={48} strokeWidth={1.5} />
          </LockIcon>
        </IconWrapper>

        <Title>비밀번호 찾기</Title>

        {/* 단계별 화면 렌더링 */}
        {step === "input_phone" ? (
          <>
            <Description>
              가입하신 휴대폰 번호를 입력해주세요.
              <br />
              인증번호를 보내드립니다.
            </Description>

            <Form onSubmit={handleSendCode}>
              <Input
                type="tel"
                placeholder="휴대폰 번호 (- 없이 입력)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <SubmitButton type="submit" disabled={loading}>
                {loading ? "발송 중..." : "인증번호 받기"}
              </SubmitButton>
            </Form>

            <Divider>
              <DividerLine />
              <DividerText>또는</DividerText>
              <DividerLine />
            </Divider>

            <SignupLink onClick={() => navigate("/login/normal?mode=signup")}>
              새 계정 만들기
            </SignupLink>
          </>
        ) : (
          <>
            <SuccessDescription>
              {phone}(으)로 전송된
              <br />
              6자리 인증번호를 입력해주세요.
            </SuccessDescription>

            <Form onSubmit={(e) => e.preventDefault()}>
              <Input
                type="text"
                placeholder="인증번호 6자리"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                maxLength={6}
              />
              <SubmitButton
                type="button"
                onClick={handleVerifyCode}
                disabled={loading}
              >
                {loading ? "확인 중..." : "인증하기"}
              </SubmitButton>
            </Form>

            {/* 번호 다시 입력하기 버튼 */}
            <ResendLink onClick={() => setStep("input_phone")}>
              전화번호 다시 입력하기
            </ResendLink>
          </>
        )}
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

const LockIcon = styled.div`
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
  margin-bottom: 16px;
`;

const SuccessDescription = styled.p`
  font-size: 14px;
  color: #8e8e8e;
  text-align: center;
  line-height: 1.5;
  margin-bottom: 24px;
`;

const Form = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 9px 8px;
  font-size: 12px;
  color: #262626;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  border-radius: 3px;

  &:focus {
    border-color: #a8a8a8;
  }

  &::placeholder {
    color: #8e8e8e;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 7px 16px;
  background: #0095f6;
  color: white;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  margin-top: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #1877f2;
  }
  &:active {
    opacity: 0.7;
  }
  &:disabled {
    background: #b2dffc;
    cursor: not-allowed;
  }
`;

const Divider = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  margin: 20px 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: #dbdbdb;
`;

const DividerText = styled.span`
  padding: 0 18px;
  color: #8e8e8e;
  font-size: 13px;
  font-weight: 600;
`;

const SignupLink = styled.button`
  font-size: 14px;
  color: #262626;
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

// ▼ [추가] 새로 만든 버튼 스타일
const ResendLink = styled.button`
  font-size: 13px;
  color: #8e8e8e;
  margin-top: 12px;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: #262626;
  }
`;

export default ForgotPassword;
