import axios from "axios"

// Determina a URL da API
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : null)

if (!API_URL) {
  console.error("VITE_API_URL não está configurado no ambiente de produção.")
}

const api = axios.create({
  baseURL: API_URL,
})

// Interceptor: adiciona o token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Interceptor: trata erro de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    return Promise.reject(error)
  }
)

export default api