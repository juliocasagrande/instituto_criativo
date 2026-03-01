import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import { useToast } from '../components/useToast'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const TIPO_STYLE = {
  profissional: { badge: 'bg-indigo-100 text-indigo-700', label: 'Profissional' },
  responsavel:  { badge: 'bg-teal-100 text-teal-700',    label: 'Responsável'  },
  admin:        { badge: 'bg-rose-100 text-rose-700',    label: 'Admin'        },
}

const formVazio = { nome: '', email: '', tipo: 'responsavel', nova_senha: '' }

export default function PainelAdmin() {
  const { logout } = useAuth()
  const navigate   = useNavigate()
  const { toasts, toast, removeToast } = useToast()

  const [stats,    setStats]    = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [aba,      setAba]      = useState('usuarios')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando,    setEditando]    = useState(null)   // usuario sendo editado
  const [criando,     setCriando]     = useState(false)  // modal de novo usuário
  const [form,        setForm]        = useState(formVazio)
  const [salvando,    setSalvando]    = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(null)

  const [filtro, setFiltro] = useState('')
  const [filtrTipo, setFiltrTipo] = useState('todos')

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats/'),
        api.get('/admin/usuarios/'),
      ])
      setStats(statsRes.data)
      setUsuarios(usersRes.data)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function abrirEdicao(u) {
    setEditando(u)
    setCriando(false)
    setForm({ nome: u.nome, email: u.email, tipo: u.tipo, nova_senha: '' })
    setModalAberto(true)
  }

  function abrirCriacao() {
    setEditando(null)
    setCriando(true)
    setForm(formVazio)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
    setCriando(false)
    setForm(formVazio)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      if (criando) {
        if (!form.nova_senha) { toast.error('Informe uma senha'); setSalvando(false); return }
        await api.post('/admin/usuarios/', {
          nome: form.nome, email: form.email, tipo: form.tipo, senha: form.nova_senha
        })
        toast.success('Usuário criado!')
      } else {
        const payload = { nome: form.nome, email: form.email, tipo: form.tipo }
        if (form.nova_senha) payload.nova_senha = form.nova_senha
        await api.patch(`/admin/usuarios/${editando.id}/`, payload)
        toast.success('Usuário atualizado!')
      }
      fecharModal()
      carregarDados()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    try {
      await api.delete(`/admin/usuarios/${id}/`)
      toast.success('Usuário excluído')
      setConfirmExcluir(null)
      carregarDados()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir')
      setConfirmExcluir(null)
    }
  }

  const usuariosFiltrados = usuarios.filter(u => {
    const buscaOk = u.nome.toLowerCase().includes(filtro.toLowerCase()) ||
                    u.email.toLowerCase().includes(filtro.toLowerCase())
    const tipoOk  = filtrTipo === 'todos' || u.tipo === filtrTipo
    return buscaOk && tipoOk
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Toasts */}
      <div className="fixed top-5 right-5 z-50 space-y-2">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
      </div>

      {/* Modal editar / criar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">
                {criando ? 'Novo usuário' : `Editar: ${editando?.nome}`}
              </h2>
              <button onClick={fecharModal} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome</label>
                <input type="text" required value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">E-mail</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tipo de acesso</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
                  <option value="responsavel">Responsável</option>
                  <option value="profissional">Profissional</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {criando ? 'Senha' : 'Nova senha (deixe em branco para não alterar)'}
                </label>
                <input type="password" value={form.nova_senha}
                  onChange={e => setForm({...form, nova_senha: e.target.value})}
                  placeholder={criando ? 'Mínimo 6 caracteres' : '••••••••'}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {salvando ? 'Salvando...' : criando ? 'Criar usuário' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={fecharModal}
                  className="px-4 py-2.5 border border-gray-600 rounded-xl text-sm text-gray-400 hover:text-white">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmação de exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 border border-rose-900">
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <h2 className="font-bold text-lg mt-3">Confirmar exclusão</h2>
              <p className="text-gray-400 text-sm mt-2">
                Você está prestes a excluir <strong className="text-white">{confirmExcluir.nome}</strong>.
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => excluir(confirmExcluir.id)}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 rounded-xl text-sm">
                Excluir
              </button>
              <button onClick={() => setConfirmExcluir(null)}
                className="flex-1 border border-gray-600 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-rose-600 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">IC</span>
          </div>
          <span className="font-semibold text-sm">Instituto Criativo</span>
          <span className="text-gray-600 mx-1">·</span>
          <span className="text-xs text-rose-400 font-medium">Painel Admin</span>
        </div>
        <button onClick={() => { logout(); navigate('/login') }}
          className="text-xs text-gray-500 hover:text-white transition-colors">
          Sair
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Cards de stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Usuários',      value: stats.usuarios,             color: 'text-white'       },
              { label: 'Profissionais', value: stats.profissionais,        color: 'text-indigo-400'  },
              { label: 'Responsáveis',  value: stats.responsaveis,         color: 'text-teal-400'    },
              { label: 'Pacientes',     value: stats.pacientes,            color: 'text-amber-400'   },
              { label: 'Total consultas',   value: stats.consultas_total,      color: 'text-white'       },
              { label: 'Realizadas',    value: stats.consultas_realizadas, color: 'text-green-400'   },
              { label: 'Agendadas',     value: stats.consultas_agendadas,  color: 'text-blue-400'    },
              { label: 'Canceladas',    value: stats.consultas_canceladas, color: 'text-rose-400'    },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Abas */}
        <div className="flex rounded-xl bg-gray-900 border border-gray-800 p-1">
          {[
            { key: 'usuarios', label: 'Gerenciar Usuários' },
          ].map(item => (
            <button key={item.key} onClick={() => setAba(item.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                aba === item.key ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Aba Usuários */}
        {aba === 'usuarios' && (
          <div className="space-y-4">
            {/* Filtros + botão novo */}
            <div className="flex gap-3 flex-wrap items-center">
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                className="flex-1 min-w-48 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder-gray-500"
              />
              <select value={filtrTipo} onChange={e => setFiltrTipo(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-white">
                <option value="todos">Todos os tipos</option>
                <option value="profissional">Profissional</option>
                <option value="responsavel">Responsável</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={abrirCriacao}
                className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex-shrink-0">
                + Novo usuário
              </button>
            </div>

            {/* Tabela */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuário</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-500 text-sm">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : usuariosFiltrados.map(u => {
                    const style = TIPO_STYLE[u.tipo] || TIPO_STYLE.responsavel
                    return (
                      <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-300 text-xs font-bold">
                                {u.nome.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-white">{u.nome}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-400">{u.email}</td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                            {style.label}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => abrirEdicao(u)}
                              className="text-xs px-3 py-1.5 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                              Editar
                            </button>
                            {u.tipo !== 'admin' && (
                              <button onClick={() => setConfirmExcluir(u)}
                                className="text-xs px-3 py-1.5 border border-rose-900 rounded-lg text-rose-500 hover:bg-rose-900/30 transition-colors">
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-600 text-right">
              {usuariosFiltrados.length} de {usuarios.length} usuário(s)
            </p>
          </div>
        )}

      </div>
    </div>
  )
}