import { useState } from "react";
import styled from "styled-components";
import { validateUsername } from "../utils/usernameValidator";

const KakaoSignupModal = ({ isOpen, onClose, kakaoUser, onSignup }) => {
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    name: kakaoUser?.nickname || "",
  });
  const [usernameError, setUsernameError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.phone) {
      // 전화번호 검증 (010으로 시작하는 11자리)
      const phoneRegex = /^010\d{8}$/;
      if (!phoneRegex.test(formData.phone)) {
        alert("010으로 시작하는 11자리 숫자를 입력해주세요. (예: 01012341234)");
        return;
      }
    }

    if (!formData.username || !formData.phone) {
      alert("사용자 이름과 전화번호는 필수입니다.");
      return;
    }

    // username 검증
    const validation = validateUsername(formData.username);
    if (!validation.valid) {
      setUsernameError(validation.message);
      return;
    }

    onSignup(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // username 필드일 때 실시간 검증
    if (name === "username") {
      if (!value) {
        setUsernameError("");
      } else {
        const validation = validateUsername(value);
        setUsernameError(validation.valid ? "" : validation.message);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>추가 정보 입력</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>
        <Form onSubmit={handleSubmit}>
          <InfoText>
            카카오 계정으로 회원가입을 완료하기 위해
            <br />
            아래 정보를 입력해주세요.
          </InfoText>
          <Input
            type="text"
            name="name"
            placeholder="성명"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <InputWrapper>
            <Input
              type="text"
              name="username"
              placeholder="사용자 이름 (닉네임)"
              value={formData.username}
              onChange={handleChange}
              required
              style={{
                borderColor: usernameError ? "#ed4956" : undefined,
              }}
            />
            {usernameError && <ErrorText>{usernameError}</ErrorText>}
          </InputWrapper>
          <Input
            type="tel"
            name="phone"
            placeholder="전화번호 (예: 01012341234)"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <ButtonGroup>
            <CancelButton type="button" onClick={onClose}>
              취소
            </CancelButton>
            <SubmitButton type="submit">가입하기</SubmitButton>
          </ButtonGroup>
        </Form>
      </ModalContainer>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin: 0;
`;

const CloseButton = styled.button`
  font-size: 28px;
  color: #8e8e8e;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #262626;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoText = styled.p`
  font-size: 14px;
  color: #8e8e8e;
  text-align: center;
  margin: 0 0 16px 0;
  line-height: 1.5;
`;

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  font-size: 14px;
  color: #262626;
  background: #fafafa;
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0095f6;
    background: white;
  }

  &::placeholder {
    color: #8e8e8e;
  }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #ed4956;
  padding-left: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 12px;
  background: #fafafa;
  color: #262626;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: #efefef;
  }
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 12px;
  background: #0095f6;
  color: white;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: #1877f2;
  }

  &:active {
    opacity: 0.7;
  }
`;

export default KakaoSignupModal;
