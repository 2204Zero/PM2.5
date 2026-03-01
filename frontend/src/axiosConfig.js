import axios from "axios";

const instance = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

instance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");

  console.log("Token being attached:", token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default instance;