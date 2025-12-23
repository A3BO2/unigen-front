import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

// 인증번호 발송 요청
export const sendSmsCode = async (phone) => {
  try {
    const response = await axios.post(`${baseURL}/senior/auth/send-code`, {
      phone,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error("SMS 발송 실패");
  }
};

// 인증번호 검증 및 로그인(시니어 로그인용)
export const seniorAuthPhone = async (phone, code) => {
  try {
    const response = await axios.post(`${baseURL}/senior/auth/phone`, {
      phone,
      code,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error("인증 실패");
  }
};

// 인증번호 검증 요청
export const verifySmsCode = async (phone, code) => {
  try {
    const response = await axios.post(`${baseURL}/senior/auth/verify-code`, {
      phone,
      code,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error("인증 실패");
  }
};
