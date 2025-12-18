import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import styled from "styled-components";
import { initKakaoSDK, loginWithKakao } from "../../utils/kakaoAuth";
import KakaoSignupModal from "../../components/KakaoSignupModal";

const NormalLogin = () => {
  const navigate = useNavigate();
  const { login } = useApp();

  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  const isSignup = mode === "signup";
  const isLogin = !isSignup;

  const [formData, setFormData] = useState({
    phone: "",
    username: "",
    password: "",
    name: "",
  });

  const [showKakaoSignupModal, setShowKakaoSignupModal] = useState(false);
  const [kakaoAccessToken, setKakaoAccessToken] = useState(null);
  const [kakaoUserInfo, setKakaoUserInfo] = useState(null);

  // 카카오 SDK 초기화
  useEffect(() => {
    const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
    if (kakaoAppKey) {
      // 카카오 SDK가 로드될 때까지 대기
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
  // 무조건 백엔드에서 사용자 확인 후, 있으면 로그인, 없으면 회원가입 모달 표시
  const processKakaoAuth = useCallback(async (accessToken) => {
    try {
      // 백엔드에 카카오 로그인 요청 (사용자 확인)
      const response = await fetch(
        "http://localhost:3000/api/v1/auth/kakao/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        // 사용자가 DB에 있음 → 로그인 성공
        localStorage.setItem("token", data.token);
        login(data.data?.user || data.user, "normal");
        // URL을 깔끔하게 정리하고 바로 홈으로 이동
        window.history.replaceState({}, document.title, "/normal/home");
        navigate("/normal/home", { replace: true });
      } else if (data.needsSignup) {
        // 사용자가 DB에 없음 → 회원가입 모달 표시
        setKakaoUserInfo(data.kakaoUser);
        setShowKakaoSignupModal(true);
      } else {
        console.error("카카오 로그인 실패:", data.message || "알 수 없는 오류");
      }
    } catch (error) {
      console.error("카카오 인증 처리 오류:", error);
    }
  }, [login, navigate]);

  // 카카오 로그인 리다이렉트 후 콜백 처리
  useEffect(() => {
    const handleKakaoCallback = async () => {
      // URL에서 카카오 인증 코드 확인
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");

      if (error) {
        console.error("카카오 로그인 오류:", errorDescription || "카카오 로그인에 실패했습니다.");
        // 에러 파라미터 제거
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        // 카카오 인증 코드가 있으면 액세스 토큰으로 교환
        try {
          const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
          // redirectUri는 authorize 호출 시와 정확히 일치해야 함
          // 쿼리스트링과 해시를 제외한 현재 URL 사용
          const currentPath = window.location.pathname;
          const redirectUri = window.location.origin + currentPath;
          
          // 카카오 토큰 발급 API 호출
          const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: kakaoAppKey,
              redirect_uri: redirectUri,
              code: code,
            }),
          });

          const tokenData = await tokenResponse.json();

          if (!tokenResponse.ok) {
            console.error("카카오 토큰 발급 실패:", tokenData);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }

          if (tokenData.access_token) {
            const accessToken = tokenData.access_token;
            setKakaoAccessToken(accessToken);
            // 코드 파라미터를 먼저 제거 (processKakaoAuth에서 navigate가 호출되기 전에)
            window.history.replaceState({}, document.title, window.location.pathname);
            await processKakaoAuth(accessToken);
          } else {
            console.error("토큰 발급 실패: access_token이 없습니다.", tokenData);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error("카카오 토큰 교환 오류:", err);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleKakaoCallback();
  }, [processKakaoAuth]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // 로그인
        const response = await fetch(
          "http://localhost:3000/api/v1/auth/login",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: formData.phone,
              password: formData.password,
            }),
          }
        );
        const data = await response.json();

        if (response.ok) {
          localStorage.setItem("token", data.token);
          login(data.data?.user || data.user, "normal");
          alert("로그인 성공!");
          navigate("/normal/home");
        } else {
          alert(data.message || "로그인 실패");
        }
      } else {
        // 회원가입
        const signupData = {
          ...formData,
          name: formData.name || formData.username, // 실명 없으면 닉네임으로 대체
          signup_mode: "phone",
          preferred_mode: "normal",
        };

        const response = await fetch(
          "http://localhost:3000/api/v1/auth/signup",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(signupData),
          }
        );
        const data = await response.json();

        if (response.ok) {
          alert("회원가입 성공! 로그인 해주세요.");
          navigate("/login");
        } else {
          alert(data.message || "회원가입 실패");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      alert("서버 연결 실패");
    }
  };

  // 카카오 버튼 클릭 시 실행 (리다이렉트 방식)
  const handleKakaoAuth = () => {
    try {
      if (!window.Kakao || !window.Kakao.isInitialized()) {
        console.error("카카오 SDK가 초기화되지 않았습니다.");
        return;
      }
      // 카카오 로그인 실행 (리다이렉트 방식)
      loginWithKakao();
      // 리다이렉트되므로 여기서는 아무것도 하지 않음
      // 콜백은 useEffect에서 처리됨
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

      const response = await fetch(
        "http://localhost:3000/api/v1/auth/kakao/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: kakaoAccessToken,
            username: signupFormData.username,
            phone: signupFormData.phone,
            name: signupFormData.name,
            preferred_mode: "normal",
          }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        // 백엔드 응답 구조: { success: true, data: { user: {...}, tokens: "..." } }
        const token = data.data?.tokens || data.token;
        if (token) {
          localStorage.setItem("token", token);
          login(data.data?.user || data.user, "normal");
          setShowKakaoSignupModal(false);
          setKakaoAccessToken(null);
          setKakaoUserInfo(null);
          // URL을 깔끔하게 정리하고 바로 홈으로 이동
          window.history.replaceState({}, document.title, "/normal/home");
          navigate("/normal/home", { replace: true });
        } else {
          console.error("토큰을 찾을 수 없습니다:", data);
        }
      } else {
        console.error("카카오 회원가입 실패:", data.message || "알 수 없는 오류");
      }
    } catch (error) {
      console.error("카카오 회원가입 오류:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleModeToggle = () => {
    if (isLogin) {
      navigate("/login/normal?mode=signup");
    } else {
      navigate("/login/normal");
    }
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate("/")}>←</BackButton>
      </Header>

      <FormContainer>
        <Logo src="/unigen_black.png" alt="Unigen" />

        <Form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <Input
                type="text"
                name="name"
                placeholder="성명 (실명)"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <Input
                type="text"
                name="username"
                placeholder="사용자 이름 (닉네임)"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </>
          )}

          <Input
            type="tel"
            name="phone"
            placeholder="전화번호"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <Input
            type="password"
            name="password"
            placeholder="비밀번호"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <SubmitButton type="submit">
            {isLogin ? "로그인" : "가입"}
          </SubmitButton>
        </Form>

        <Divider>
          <DividerLine />
          <DividerText>또는</DividerText>
          <DividerLine />
        </Divider>

        <SocialButton type="button" onClick={handleKakaoAuth}>
          카카오로 시작하기
        </SocialButton>

        <ForgotPassword onClick={() => navigate("/forgot-password")}>
          비밀번호를 잊으셨나요?
        </ForgotPassword>
      </FormContainer>

      <SignupBox>
        {isLogin ? "계정이 없으신가요?" : "계정이 있으신가요?"}
        <SignupLink onClick={handleModeToggle}>
          {isLogin ? " 가입하기" : " 로그인"}
        </SignupLink>
      </SignupBox>

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
  background: #fafafa;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const Header = styled.div`
  width: 100%;
  max-width: 350px;
  margin-bottom: 20px;
`;

const BackButton = styled.button`
  font-size: 24px;
  color: #262626;
  padding: 8px;

  &:hover {
    opacity: 0.7;
  }
`;

const FormContainer = styled.div`
  max-width: 350px;
  width: 100%;
  background: white;
  border: 1px solid #dbdbdb;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Logo = styled.img`
  height: 60px;
  margin-bottom: 24px;
`;

const Form = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  padding: 10px 16px;
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

const SocialButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  background: #fee500;
  color: #000000;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #fdd835;
  }

  &:active {
    opacity: 0.8;
  }
`;

const ForgotPassword = styled.a`
  font-size: 12px;
  color: #00376b;
  cursor: pointer;

  &:hover {
    opacity: 0.7;
  }
`;

const SignupBox = styled.div`
  max-width: 350px;
  width: 100%;
  margin: 10px 0 0;
  padding: 24px;
  background: white;
  border: 1px solid #dbdbdb;
  text-align: center;
  font-size: 14px;
  color: #262626;
`;

const SignupLink = styled.span`
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.7;
  }
`;

export default NormalLogin;
