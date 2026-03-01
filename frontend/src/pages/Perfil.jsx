import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import { useToast } from '../components/useToast'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Perfil() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const { toasts, toast, removeToast } = useToast()
  usePageTitle('Meu Perfil')
  const isProfissional = user?.tipo === 'profissional'

  const [formDados, setFormDados] = useState({ nome: user?.nome || '', email: user?.email || '' })
  const [formSenha, setFormSenha] = useState({ senha_atual: '', nova_senha: '', confirmar: '' })
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const voltar = isProfissional ? '/profissional' : '/responsavel'
  const corPrimaria = isProfissional ? 'indigo' : 'teal'

  async function salvarDados(e) {
    e.preventDefault()
    setSalvandoDados(true)
    try {
      const res = await api.patch('/auth/me/', {
        nome: formDados.nome,
        email: formDados.email,
      })
      // Atualiza o usuário no contexto e localStorage
      const userAtualizado = { ...user, nome: res.data.nome, email: res.data.email }
      updateUser({ nome: res.data.nome, email: res.data.email })
      toast.success('Dados atualizados com sucesso!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar dados')
    } finally {
      setSalvandoDados(false)
    }
  }

  async function salvarSenha(e) {
    e.preventDefault()
    if (formSenha.nova_senha !== formSenha.confirmar) {
      toast.error('A nova senha e a confirmação não coincidem')
      return
    }
    if (formSenha.nova_senha.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    setSalvandoSenha(true)
    try {
      await api.patch('/auth/me/', {
        senha_atual: formSenha.senha_atual,
        nova_senha: formSenha.nova_senha,
      })
      toast.success('Senha alterada com sucesso!')
      setFormSenha({ senha_atual: '', nova_senha: '', confirmar: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao alterar senha')
    } finally {
      setSalvandoSenha(false)
    }
  }

  const bannerBg = isProfissional ? 'bg-indigo-700' : 'bg-teal-700'
  const ringColor = isProfissional ? 'focus:ring-indigo-400' : 'focus:ring-teal-400'
  const btnColor = isProfissional
    ? 'bg-indigo-600 hover:bg-indigo-700'
    : 'bg-teal-600 hover:bg-teal-700'
  const borderColor = isProfissional ? 'border-indigo-100' : 'border-teal-100'

  return (
    <div className={`min-h-screen ${isProfissional ? 'bg-indigo-50' : 'bg-teal-50'}`}>
      <Navbar />

      <div className="fixed top-5 right-5 z-50 space-y-2">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
      </div>

      {/* Banner */}
      <div className={`${bannerBg} text-white px-6 py-5`}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <p className={`${isProfissional ? 'text-indigo-200' : 'text-teal-200'} text-xs font-medium mb-0.5`}>
              {isProfissional ? 'Área da Profissional' : 'Área do Responsável'}
            </p>
            <h1 className="text-xl font-bold">Meu Perfil</h1>
            <p className={`${isProfissional ? 'text-indigo-200' : 'text-teal-200'} text-xs mt-1`}>
              Gerencie seus dados de acesso
            </p>
          </div>
          <button onClick={() => navigate(voltar)}
            className="text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-colors">
            ← Voltar
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Avatar */}
        <div className={`bg-white rounded-2xl p-5 border ${borderColor} shadow-sm flex items-center gap-4`}>
          <div className={`w-14 h-14 ${isProfissional ? 'bg-indigo-100' : 'bg-teal-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
            <span className={`${isProfissional ? 'text-indigo-700' : 'text-teal-700'} text-2xl font-bold`}>
              {user?.nome?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.nome}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${isProfissional ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
              {isProfissional ? 'Profissional' : 'Responsável'}
            </span>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className={`bg-white rounded-2xl p-6 border ${borderColor} shadow-sm`}>
          <h2 className="font-semibold text-gray-800 mb-4">Dados pessoais</h2>
          <form onSubmit={salvarDados} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
              <input type="text" required value={formDados.nome}
                onChange={e => setFormDados({ ...formDados, nome: e.target.value })}
                className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${ringColor} bg-gray-50`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" required value={formDados.email}
                onChange={e => setFormDados({ ...formDados, email: e.target.value })}
                className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${ringColor} bg-gray-50`}
              />
            </div>
            <button type="submit" disabled={salvandoDados}
              className={`w-full ${btnColor} text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50`}>
              {salvandoDados ? 'Salvando...' : 'Salvar dados'}
            </button>
          </form>
        </div>

        {/* Alterar senha */}
        <div className={`bg-white rounded-2xl p-6 border ${borderColor} shadow-sm`}>
          <h2 className="font-semibold text-gray-800 mb-1">Alterar senha</h2>
          <p className="text-xs text-gray-400 mb-4">Mínimo de 6 caracteres</p>
          <form onSubmit={salvarSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha atual</label>
              <input type="password" required value={formSenha.senha_atual}
                onChange={e => setFormSenha({ ...formSenha, senha_atual: e.target.value })}
                className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${ringColor} bg-gray-50`}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nova senha</label>
              <input type="password" required value={formSenha.nova_senha}
                onChange={e => setFormSenha({ ...formSenha, nova_senha: e.target.value })}
                className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${ringColor} bg-gray-50`}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Confirmar nova senha</label>
              <input type="password" required value={formSenha.confirmar}
                onChange={e => setFormSenha({ ...formSenha, confirmar: e.target.value })}
                className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${ringColor} bg-gray-50`}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={salvandoSenha}
              className={`w-full ${btnColor} text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50`}>
              {salvandoSenha ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}