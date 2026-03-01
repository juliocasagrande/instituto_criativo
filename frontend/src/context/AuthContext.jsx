import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('token')
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  async function login(email, senha) {
    const { data } = await api.post('/auth/login/', { email, senha })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
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

  // Atualiza o usuário no state e no localStorage (usado pela página de perfil)
  function updateUser(dadosAtualizados) {
    const userAtualizado = { ...user, ...dadosAtualizados }
    localStorage.setItem('user', JSON.stringify(userAtualizado))
    setUser(userAtualizado)
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