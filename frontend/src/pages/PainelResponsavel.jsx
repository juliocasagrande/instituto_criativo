import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import { useToast } from '../components/useToast'
import ListaConsultas from '../components/ListaConsultas'
import api from '../services/api'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuth } from '../context/AuthContext'

export default function PainelResponsavel() {
  const { user } = useAuth()
  
  const navigate = useNavigate()
  usePageTitle(user?.nome ? `${user.nome} | Painel` : 'Painel')
  const [pacientes, setPacientes] = useState([])
  const [consultas, setConsultas] = useState([])
  const [proximasConsultas, setProximasConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindoPaciente, setExcluindoPaciente] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null) // paciente sendo editado
  const [aba, setAba] = useState('consultas')
  const { toasts, toast, removeToast } = useToast()

  const formVazio = { nome: '', data_nascimento: '', observacoes: '' }
  const [form, setForm] = useState(formVazio)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    try {
      const [pacRes, consRes, proxRes] = await Promise.all([
        api.get('/patients/'),
        api.get('/appointments/'),
        api.get('/appointments/proximos'),
      ])
      setPacientes(pacRes.data)
      setConsultas(consRes.data)
      setProximasConsultas(proxRes.data)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function cadastrarPaciente(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.post('/patients/', form)
      toast.success('Paciente cadastrado com sucesso!')
      setForm(formVazio)
      setMostrarForm(false)
      carregarDados()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cadastrar')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarEdicao(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.put(`/patients/${editando.id}/`, form)
      toast.success('Dados atualizados com sucesso!')
      setEditando(null)
      setForm(formVazio)
      carregarDados()
    } catch (err) {
      // Se PUT não existir, tenta PATCH
      try {
        await api.patch(`/patients/${editando.id}/`, form)
        toast.success('Dados atualizados com sucesso!')
        setEditando(null)
        setForm(formVazio)
        carregarDados()
      } catch (err2) {
        toast.error(err2.response?.data?.detail || 'Erro ao atualizar')
      }
    } finally {
      setSalvando(false)
    }
  }

  function iniciarEdicao(paciente) {
    setEditando(paciente)
    setForm({
      nome: paciente.nome,
      data_nascimento: paciente.data_nascimento,
      observacoes: paciente.observacoes || '',
    })
    setMostrarForm(false)
  }

  async function excluirPaciente(paciente) {
    if (!confirm(`Deseja excluir ${paciente.nome}? Todas as consultas vinculadas também serão removidas.`)) return
    setExcluindoPaciente(paciente.id)
    try {
      await api.delete(`/patients/${paciente.id}/`)
      toast.success('Paciente excluído com sucesso')
      carregarDados()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir paciente')
    } finally {
      setExcluindoPaciente(null)
    }
  }

  function calcularIdade(dataNasc) {
    const hoje = new Date()
    const nasc = new Date(dataNasc + 'T00:00:00')
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-teal-50">
      <Navbar />

      <div className="fixed top-5 right-5 z-50 space-y-2">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
      </div>

      {/* Banner */}
      <div className="bg-teal-700 text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-teal-200 text-xs font-medium mb-0.5">Área do Responsável</p>
            <h1 className="text-xl font-bold">Olá, {user?.nome?.split(' ')[0]}!</h1>
            <p className="text-teal-200 text-xs mt-1">
              {consultas.filter(c => c.status === 'agendado').length} consulta(s) ativa(s) · {pacientes.length} paciente(s)
            </p>
          </div>
          <button onClick={() => navigate('/agendar')}
            className="bg-white text-teal-700 hover:bg-teal-50 text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0 ml-6">
            + Agendar consulta
          </button>
        </div>
      </div>

      {/* Lembrete de consultas próximas */}
      {proximasConsultas.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⏰</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Lembrete de consulta</p>
              {proximasConsultas.map(c => (
                <p key={c.id} className="text-xs text-amber-700 mt-0.5">
                  {c.patient?.nome} · {new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {c.hora_inicio.slice(0,5)}
                  {' — '}Lembrete enviado para {user?.email}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Abas */}
        <div className="flex rounded-xl bg-white border border-teal-100 p-1 shadow-sm">
          <button onClick={() => setAba('consultas')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${aba === 'consultas' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Minhas Consultas
          </button>
          <button onClick={() => setAba('pacientes')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${aba === 'pacientes' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Filhos / Tutorados
          </button>
        </div>

        {/* Aba Consultas */}
        {aba === 'consultas' && (
          <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm">
            <ListaConsultas consultas={consultas} onAtualizar={carregarDados} perfil="responsavel" toast={toast} />
          </div>
        )}

        {/* Aba Pacientes */}
        {aba === 'pacientes' && (
          <>
            <div className="flex justify-end">
              <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(formVazio) }}
                className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${mostrarForm ? 'bg-gray-100 text-gray-600' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                {mostrarForm ? 'Cancelar' : '+ Novo cadastro'}
              </button>
            </div>

            {/* Formulário novo paciente */}
            {mostrarForm && !editando && (
              <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-4">Novo filho / tutorado</h2>
                <form onSubmit={cadastrarPaciente} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
                    <input type="text" required value={form.nome}
                      onChange={e => setForm({ ...form, nome: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-gray-50"
                      placeholder="Nome da criança ou adolescente"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Data de nascimento</label>
                    <input type="date" required value={form.data_nascimento}
                      onChange={e => setForm({ ...form, data_nascimento: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Observações <span className="text-gray-300 font-normal">(opcional)</span></label>
                    <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                      rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-gray-50 resize-none"
                      placeholder="Informações relevantes para a profissional..." />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={salvando}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50">
                      {salvando ? 'Salvando...' : 'Cadastrar'}
                    </button>
                    <button type="button" onClick={() => setMostrarForm(false)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Formulário edição */}
            {editando && (
              <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800">Editar: {editando.nome}</h2>
                  <button onClick={() => { setEditando(null); setForm(formVazio) }}
                    className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>
                <form onSubmit={salvarEdicao} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Nome completo</label>
                    <input type="text" required value={form.nome}
                      onChange={e => setForm({ ...form, nome: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Data de nascimento</label>
                    <input type="date" required value={form.data_nascimento}
                      onChange={e => setForm({ ...form, data_nascimento: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Observações</label>
                    <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                      rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50 resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={salvando}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50">
                      {salvando ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                    <button type="button" onClick={() => { setEditando(null); setForm(formVazio) }}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de pacientes */}
            {pacientes.length === 0 && !mostrarForm ? (
              <div className="bg-white rounded-2xl p-12 border border-teal-100 shadow-sm text-center">
                <span className="text-3xl">👶</span>
                <p className="font-medium text-gray-600 mt-3">Nenhum cadastro ainda</p>
                <p className="text-sm text-gray-400 mt-1">Clique em "+ Novo cadastro" para adicionar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pacientes.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl p-5 border border-teal-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-teal-700 font-bold text-lg">{p.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{p.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400">{calcularIdade(p.data_nascimento)} anos</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400">Nasc: {new Date(p.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                      {p.observacoes && (
                        <p className="text-xs text-gray-400 mt-1 italic bg-gray-50 rounded-lg px-2 py-1">{p.observacoes}</p>
                      )}
                    </div>
                    <button onClick={() => navigate(`/historico/${p.id}`)}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors flex-shrink-0">
                      Histórico
                    </button>
                    <button onClick={() => iniciarEdicao(p)}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0">
                      Editar
                    </button>
                    <button onClick={() => excluirPaciente(p)}
                      disabled={excluindoPaciente === p.id}
                      className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50">
                      {excluindoPaciente === p.id ? '...' : 'Excluir'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}