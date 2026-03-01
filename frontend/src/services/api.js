import axios from "axios"

// Em produção (Railway): usa VITE_API_URL injetada no build
// Em desenvolvimento: usa localhost
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

console.log("API_URL =", API_URL)

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default api