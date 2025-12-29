import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import styled from "styled-components";
import { initKakaoSDK, loginWithKakao } from "../../utils/kakaoAuth";
import KakaoSignupModal from "../../components/KakaoSignupModal";
import { sendSmsCode, seniorAuthPhone } from "../../services/sms";

const SeniorLogin = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [step, setStep] = useState("phone"); // phone, code
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showKakaoSignupModal, setShowKakaoSignupModal] = useState(false);
  const [kakaoAccessToken, setKakaoAccessToken] = useState(null);
  const [kakaoUserInfo, setKakaoUserInfo] = useState(null);

  // 카카오 SDK 초기화
  useEffect(() => {
    const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
    if (kakaoAppKey) {
      const checkKakaoSDK = setInterval(() => {
        if (window.Kakao) {
          initKakaoSDK(kakaoAppKey);
          clearInterval(checkKakaoSDK);
        }
      }, 100);

      return () => clearInterval(checkKakaoSDK);
    }
  }, []);

  // 카카오 인증 처리 공통 함수
  const processKakaoAuth = useCallback(
    async (accessToken) => {
      try {
        const apiBaseURL = import.meta.env.VITE_API_BASE_URL;
        if (!apiBaseURL) {
          throw new Error("VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.");
        }
        const response = await fetch(
          `${apiBaseURL}/senior/auth/kakao/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: accessToken }),
          }
        );
        const data = await response.json();

        if (response.ok) {
          sessionStorage.setItem("token", data.token);
          await login(data.data?.user || data.user, "senior");
          window.history.replaceState({}, document.title, "/senior/home");
          navigate("/senior/home", { replace: true });
        } else if (data.needsSignup) {
          setKakaoUserInfo(data.kakaoUser);
          setShowKakaoSignupModal(true);
        } else {
          alert(data.message || "카카오 로그인 실패");
        }
      } catch (error) {
        console.error("카카오 인증 처리 오류:", error);
        alert("카카오 로그인 중 오류가 발생했습니다.");
      }
    },
    [login, navigate]
  );

  // 카카오 로그인 리다이렉트 후 콜백 처리
  useEffect(() => {
    const handleKakaoCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");

      if (error) {
        console.error(
          "카카오 로그인 오류:",
          errorDescription || "카카오 로그인에 실패했습니다."
        );
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        return;
      }

      if (code) {
        try {
          const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
          const currentPath = window.location.pathname;
          const redirectUri = window.location.origin + currentPath;

          const tokenResponse = await fetch(
            "https://kauth.kakao.com/oauth/token",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded;charset=utf-8",
              },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: kakaoAppKey,
                redirect_uri: redirectUri,
                code: code,
              }),
            }
          );

          const tokenData = await tokenResponse.json();

          if (!tokenResponse.ok) {
            console.error("카카오 토큰 발급 실패:", tokenData);
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
            return;
          }

          if (tokenData.access_token) {
            const accessToken = tokenData.access_token;
            setKakaoAccessToken(accessToken);
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
            await processKakaoAuth(accessToken);
          } else {
            console.error(
              "토큰 발급 실패: access_token이 없습니다.",
              tokenData
            );
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          }
        } catch (err) {
          console.error("카카오 토큰 교환 오류:", err);
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      }
    };

    handleKakaoCallback();
  }, [processKakaoAuth]);

  const handleSendCode = async () => {
    const cleanPhone = phoneNumber.replace(/-/g, "");
    if (cleanPhone.length < 10) {
      alert("올바른 전화번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // api 호출
      await sendSmsCode(cleanPhone);
      alert("인증번호가 발송되었습니다.");
      setStep("code");
    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "인증번호 발송에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      alert("6자리 인증번호를 입력해주세요.");
      return;
    }

    const cleanPhone = phoneNumber.replace(/-/g, "");
    setIsLoading(true);
    try {
      // api 호출
      // seniorAuthPhone은 검증 + 로그인까지 한 번에 수행
      const data = await seniorAuthPhone(cleanPhone, verificationCode);

      // 성공 시 처리
      if (data.token) {
        sessionStorage.setItem("token", data.token);
        await login(data.data?.user || data.user, "senior");
        alert("로그인 성공!");
        navigate("/senior/home");
      } else {
        alert("로그인 정보가 올바르지 않습니다.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "인증에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 카카오 버튼 클릭 시 실행
  const handleKakaoAuth = () => {
    try {
      if (!window.Kakao || !window.Kakao.isInitialized()) {
        console.error("카카오 SDK가 초기화되지 않았습니다.");
        return;
      }
      loginWithKakao();
    } catch (error) {
      console.error("카카오 로그인 오류:", error);
    }
  };

  // 카카오 회원가입 처리
  const handleKakaoSignup = async (signupFormData) => {
    try {
      if (!kakaoAccessToken) {
        return;
      }

      const apiBaseURL = import.meta.env.VITE_API_BASE_URL;
      if (!apiBaseURL) {
        throw new Error("VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.");
      }

      const response = await fetch(
        `${apiBaseURL}/senior/auth/kakao/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: kakaoAccessToken,
            username: signupFormData.username,
            phone: signupFormData.phone,
            name: signupFormData.name,
          }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        const token = data.data?.tokens || data.token;
        if (token) {
          sessionStorage.setItem("token", token);
          await login(data.data?.user || data.user, "senior");
          setShowKakaoSignupModal(false);
          setKakaoAccessToken(null);
          setKakaoUserInfo(null);
          window.history.replaceState({}, document.title, "/senior/home");
          navigate("/senior/home", { replace: true });
        } else {
          console.error("토큰을 찾을 수 없습니다:", data);
        }
      } else {
        alert(data.message || "카카오 회원가입 실패");
      }
    } catch (error) {
      console.error("카카오 회원가입 오류:", error);
      alert("카카오 회원가입 중 오류가 발생했습니다.");
    }
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate("/")}>← 뒤로</BackButton>
      </Header>

      <Content>
        <Title>간단하게 시작하기</Title>

        {step === "phone" ? (
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

            <Button
              onClick={handleSendCode}
              disabled={phoneNumber.length < 10 || isLoading}
            >
              {isLoading ? "발송 중..." : "인증번호 받기"}
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
                onChange={(e) =>
                  setVerificationCode(e.target.value.slice(0, 6))
                }
                maxLength={6}
                autoFocus
              />
            </InputContainer>

            <Button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || isLoading}
            >
              {isLoading ? "인증 중..." : "시작하기"}
            </Button>

            <ResendButton onClick={() => setStep("phone")}>
              전화번호 다시 입력
            </ResendButton>
          </>
        )}

        <Divider>
          <DividerLine />
          <DividerText>또는</DividerText>
          <DividerLine />
        </Divider>

        <SocialButton type="button" onClick={handleKakaoAuth}>
          카카오로 시작하기
        </SocialButton>

        <TermsText>
          계속 진행하시면 <TermsLink>이용약관</TermsLink>에 동의하는 것으로
          간주됩니다
        </TermsText>
      </Content>

      <KakaoSignupModal
        isOpen={showKakaoSignupModal}
        onClose={() => {
          setShowKakaoSignupModal(false);
          setKakaoAccessToken(null);
          setKakaoUserInfo(null);
        }}
        kakaoUser={kakaoUserInfo}
        onSignup={handleKakaoSignup}
      />
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
  background: ${(props) => (props.disabled ? "#ccc" : "#667eea")};
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.disabled ? "#ccc" : "#5568d3")};
  }

  &:active {
    transform: ${(props) => (props.disabled ? "none" : "scale(0.98)")};
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

const Divider = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  margin: 24px 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: #ddd;
`;

const DividerText = styled.span`
  padding: 0 18px;
  color: #999;
  font-size: 16px;
`;

const SocialButton = styled.button`
  width: 100%;
  font-size: 22px;
  font-weight: 600;
  color: #000;
  background: #fee500;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fdd835;
  }

  &:active {
    transform: scale(0.98);
  }
`;

export default SeniorLogin;
