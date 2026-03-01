import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { getStoredUser, getStoredToken, safeJsonParse } from '../utils/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = getStoredToken()
    const savedUserRaw = localStorage.getItem('user')
    const savedUser = safeJsonParse(savedUserRaw, null)

    // Se tiver lixo ("undefined", JSON inválido etc), limpa para não travar o app
    if (savedUserRaw && savedUser === null && savedUserRaw !== 'null') {
      localStorage.removeItem('user')
    }
    if (localStorage.getItem('token') && !savedToken) {
      localStorage.removeItem('token')
    }

    // Só seta user se os dois existirem e forem válidos
    if (savedToken && savedUser) {
      setUser(savedUser)
    }

    setLoading(false)
  }, [])

  async function login(email, senha) {
    const { data } = await api.post('/auth/login/', { email, senha })

    if (data?.access_token) {
      localStorage.setItem('token', data.access_token)
    } else {
      localStorage.removeItem('token')
    }

    // Protege contra data.user = undefined (que vira "undefined" no storage)
    if (data?.user) {
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } else {
      localStorage.removeItem('user')
      setUser(null)
      // opcional: você pode lançar erro para o UI tratar
      // throw new Error("Login retornou token mas não retornou usuário.")
      return null
    }
  }

  async function register(nome, email, senha, tipo) {
    const { data } = await api.post('/auth/register/', { nome, email, senha, tipo })
    return data
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  function updateUser(dadosAtualizados) {
    const userAtualizado = { ...(user ?? {}), ...dadosAtualizados }

    // Só salva se for um objeto válido
    if (userAtualizado && typeof userAtualizado === 'object') {
      localStorage.setItem('user', JSON.stringify(userAtualizado))
      setUser(userAtualizado)
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, register, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}