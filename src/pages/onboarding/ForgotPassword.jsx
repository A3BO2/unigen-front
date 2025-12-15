import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Lock } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [contact, setContact] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // 실제로는 여기서 비밀번호 재설정 이메일/SMS를 보내는 API를 호출
    setIsSubmitted(true);
  };

  return (
    <Container>
      <FormContainer>
        <IconWrapper>
          <LockIcon>
            <Lock size={48} strokeWidth={1.5} />
          </LockIcon>
        </IconWrapper>

        <Title>로그인에 문제가 있나요?</Title>

        {!isSubmitted ? (
          <>
            <Description>
              이메일 주소 또는 전화번호를 입력하시면 계정에 다시 액세스할 수 있는 링크를 보내드립니다.
            </Description>

            <Form onSubmit={handleSubmit}>
              <Input
                type="text"
                placeholder="이메일 주소 또는 전화번호"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
              />
              <SubmitButton type="submit">
                로그인 링크 보내기
              </SubmitButton>
            </Form>

            <Divider>
              <DividerLine />
              <DividerText>또는</DividerText>
              <DividerLine />
            </Divider>

            <SignupLink onClick={() => navigate('/login/normal?mode=signup')}>
              새 계정 만들기
            </SignupLink>
          </>
        ) : (
          <>
            <SuccessDescription>
              {contact}(으)로 로그인 링크를 보내드렸습니다. 스팸 폴더도 확인해 주세요.
            </SuccessDescription>
            <SubmitButton onClick={() => setIsSubmitted(false)}>
              확인
            </SubmitButton>
          </>
        )}
      </FormContainer>

      <BackToLogin onClick={() => navigate('/login/normal')}>
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

export default ForgotPassword;
