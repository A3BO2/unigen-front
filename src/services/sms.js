import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

const getHeaders = () => {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 인증번호 발송 요청
export const sendSmsCode = async (phone, type) => {
  try {
    const response = await axios.post(`${baseURL}/auth/send-code`, {
      phone,
      type,
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
    const response = await axios.post(`${baseURL}/auth/verify-code`, {
      phone,
      code,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error("인증 실패");
  }
};

export const changePassword = async (params) => {
  try {
    const response = await axios.post(
      `${baseURL}/auth/change-password`,
      params,
      { headers: getHeaders() }
    );
    return response.data;
  } catch (error) {
    throw error.response
      ? error.response.data
      : new Error("비밀번호 변경 실패");
  }
};
