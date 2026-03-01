import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [aba, setAba] = useState('login') // 'login' | 'cadastro'
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Campos de login
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' })

  // Campos de cadastro
  const [cadastroForm, setCadastroForm] = useState({
    nome: '', email: '', senha: '', tipo: 'responsavel'
  })

  const { login, register } = useAuth()
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const user = await login(loginForm.email, loginForm.senha)
      navigate(user.tipo === 'profissional' ? '/profissional' : '/responsavel')
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  async function handleCadastro(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await register(cadastroForm.nome, cadastroForm.email, cadastroForm.senha, cadastroForm.tipo)
      setAba('login')
      setErro('')
      alert('Cadastro realizado! Faça login para continuar.')
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">IC</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Instituto Criativo</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Agendamento</p>
        </div>

        {/* Abas */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            onClick={() => { setAba('login'); setErro('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              aba === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setAba('cadastro'); setErro('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              aba === 'cadastro' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {erro}
          </div>
        )}

        {/* Formulário de Login */}
        {aba === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                required
                value={loginForm.senha}
                onChange={e => setLoginForm({ ...loginForm, senha: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Formulário de Cadastro */}
        {aba === 'cadastro' && (
          <form onSubmit={handleCadastro} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input
                type="text"
                required
                value={cadastroForm.nome}
                onChange={e => setCadastroForm({ ...cadastroForm, nome: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={cadastroForm.email}
                onChange={e => setCadastroForm({ ...cadastroForm, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                required
                value={cadastroForm.senha}
                onChange={e => setCadastroForm({ ...cadastroForm, senha: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de conta</label>
              <select
                value={cadastroForm.tipo}
                onChange={e => setCadastroForm({ ...cadastroForm, tipo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="responsavel">Responsável</option>
                <option value="profissional">Profissional</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}