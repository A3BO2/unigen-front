import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import styled from "styled-components";

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

  // 카카오 버튼 클릭 시 실행
  const handleKakaoAuth = async () => {
    console.log("카카오 로그인 시도");
    alert("카카오 로그인은 추후 API 연동 예정입니다.");
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
          {isLogin ? "카카오로 로그인" : "카카오로 회원가입"}
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
