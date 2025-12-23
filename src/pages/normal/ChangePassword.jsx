import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { KeyRound, ChevronLeft } from "lucide-react";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({
    currentPassword: "", // 설정에서 들어왔을 때만 필요할 수 있음 (선택 사항)
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (passwords.newPassword.length < 4) {
      setError("비밀번호는 최소 4자 이상이어야 합니다.");
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    // TODO: 여기서 실제 서버로 비밀번호 변경 요청을 보냅니다.
    // await updatePassword(passwords.newPassword);

    alert("비밀번호가 성공적으로 변경되었습니다.");
    navigate("./login/normal");
  };

  return (
    <Container>
      <FormContainer>
        <Header>
          <BackButton onClick={() => navigate(-1)}>
            <ChevronLeft size={24} />
          </BackButton>
          <Title>비밀번호 변경</Title>
        </Header>

        <IconWrapper>
          <KeyIcon>
            <KeyRound size={48} strokeWidth={1.5} />
          </KeyIcon>
        </IconWrapper>

        <Description>새로운 비밀번호를 입력해 주세요.</Description>

        <Form onSubmit={handleSubmit}>
          <Input
            type="password"
            name="newPassword"
            placeholder="새 비밀번호"
            value={passwords.newPassword}
            onChange={handleChange}
            required
          />
          <Input
            type="password"
            name="confirmPassword"
            placeholder="새 비밀번호 확인"
            value={passwords.confirmPassword}
            onChange={handleChange}
            required
          />

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <SubmitButton type="submit">비밀번호 변경</SubmitButton>
        </Form>
      </FormContainer>
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
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (max-width: 450px) {
    background: transparent;
    border: none;
    padding: 20px;
  }
`;

const Header = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #262626;
  position: absolute;
  left: 0;
`;

const Title = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  text-align: center;
  width: 100%;
`;

const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
`;

const KeyIcon = styled.div`
  width: 80px;
  height: 80px;
  border: 3px solid #262626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #262626;
`;

const Description = styled.p`
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

const ErrorMessage = styled.span`
  color: #ed4956;
  font-size: 12px;
  text-align: center;
  margin-top: 4px;
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
`;

export default ChangePassword;
