import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import { useToast } from '../components/useToast'
import ListaConsultas from '../components/ListaConsultas'
import api from '../services/api'

const DIAS = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca',   label: 'Terça-feira'   },
  { value: 'quarta',  label: 'Quarta-feira'  },
  { value: 'quinta',  label: 'Quinta-feira'  },
  { value: 'sexta',   label: 'Sexta-feira'   },
  { value: 'sabado',  label: 'Sábado'        },
]

function calcularIdade(dataNasc) {
  const hoje = new Date()
  const nasc = new Date(dataNasc + 'T00:00:00')
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function PainelProfissional() {
  const navigate = useNavigate()
  const [slots, setSlots] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [aba, setAba] = useState('consultas')
  const { toasts, toast, removeToast } = useToast()

  const [form, setForm] = useState({ dia_semana: 'segunda', hora_inicio: '08:00', hora_fim: '12:00' })

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    try {
      const [slotsRes, pacientesRes, consRes] = await Promise.all([
        api.get('/schedule/availability/'),
        api.get('/patients/'),
        api.get('/appointments/'),
      ])
      setSlots(slotsRes.data)
      setPacientes(pacientesRes.data)
      setConsultas(consRes.data)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function adicionarSlot(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.post('/schedule/availability/', form)
      toast.success('Horário adicionado com sucesso!')
      carregarDados()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao adicionar horário')
    } finally {
      setSalvando(false)
    }
  }

  async function removerSlot(id) {
    if (!confirm('Deseja remover este horário?')) return
    try {
      await api.delete(`/schedule/availability/${id}/`)
      setSlots(slots.filter(s => s.id !== id))
      toast.success('Horário removido')
    } catch {
      toast.error('Erro ao remover horário')
    }
  }

  const slotsPorDia = DIAS.map(dia => ({
    ...dia,
    slots: slots.filter(s => s.dia_semana === dia.value)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  })).filter(d => d.slots.length > 0)

  const consultasAtivas = consultas.filter(c => c.status === 'agendado').length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-indigo-50">
      <Navbar />

      <div className="fixed top-5 right-5 z-50 space-y-2">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
      </div>

      {/* Banner */}
      <div className="bg-indigo-700 text-white px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-indigo-200 text-xs font-medium mb-0.5">Área da Profissional</p>
          <h1 className="text-xl font-bold">Painel de Gestão</h1>
          <p className="text-indigo-200 text-xs mt-1">
            {consultasAtivas} consulta(s) ativa(s) · {pacientes.length} paciente(s) · {slots.length} bloco(s) configurado(s)
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Abas */}
        <div className="flex rounded-xl bg-white border border-indigo-100 p-1 shadow-sm">
          {[
            { key: 'consultas', label: 'Consultas Agendadas' },
            { key: 'agenda', label: 'Disponibilidade' },
            { key: 'pacientes', label: 'Pacientes' },
          ].map(item => (
            <button key={item.key} onClick={() => setAba(item.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                aba === item.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Aba Consultas */}
        {aba === 'consultas' && (
          <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Todas as consultas</h2>
            <ListaConsultas
              consultas={consultas}
              onAtualizar={carregarDados}
              perfil="profissional"
              toast={toast}
            />
          </div>
        )}

        {/* Aba Disponibilidade */}
        {aba === 'agenda' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-xs">🕐</span>
                <h2 className="font-semibold text-gray-800">Adicionar disponibilidade</h2>
              </div>
              <p className="text-xs text-gray-400 mb-5 ml-9">
                Defina os dias e horários em que você está disponível para atendimento.
              </p>
              <form onSubmit={adicionarSlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Dia da semana</label>
                  <select value={form.dia_semana}
                    onChange={e => setForm({ ...form, dia_semana: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50">
                    {DIAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Início</label>
                    <input type="time" value={form.hora_inicio}
                      onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Fim</label>
                    <input type="time" value={form.hora_fim}
                      onChange={e => setForm({ ...form, hora_fim: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50" />
                  </div>
                </div>
                <button type="submit" disabled={salvando}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {salvando ? 'Salvando...' : '+ Adicionar horário'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">Disponibilidade semanal</h2>
              {slotsPorDia.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Nenhum horário configurado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {slotsPorDia.map(dia => (
                    <div key={dia.value} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm font-medium text-gray-500 w-28 flex-shrink-0">{dia.label}</span>
                      <div className="flex flex-wrap gap-2">
                        {dia.slots.map(slot => (
                          <div key={slot.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
                            <span className="text-sm text-indigo-700 font-medium">
                              {slot.hora_inicio.slice(0,5)} – {slot.hora_fim.slice(0,5)}
                            </span>
                            <button onClick={() => removerSlot(slot.id)}
                              className="text-indigo-300 hover:text-rose-500 transition-colors text-xs">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba Pacientes */}
        {aba === 'pacientes' && (
          <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Todos os pacientes</h2>
            {pacientes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Nenhum paciente cadastrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pacientes.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-700 font-bold">{p.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{p.nome}</p>
                      <p className="text-xs text-gray-500">
                        {calcularIdade(p.data_nascimento)} anos · Nasc: {new Date(p.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/historico/${p.id}`)}
                      className="text-xs px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors flex-shrink-0">
                      Ver histórico →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}