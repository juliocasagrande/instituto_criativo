import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import { useToast } from '../components/useToast'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { usePageTitle } from '../hooks/usePageTitle'

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

function gerarHorarios(inicio, fim) {
  const slots = []
  const [hI, mI] = inicio.split(':').map(Number)
  const [hF, mF] = fim.split(':').map(Number)
  let atual = hI * 60 + mI
  const final = hF * 60 + mF
  while (atual + 50 <= final) {
    const h = String(Math.floor(atual / 60)).padStart(2, '0')
    const m = String(atual % 60).padStart(2, '0')
    const fH = String(Math.floor((atual + 50) / 60)).padStart(2, '0')
    const fM = String((atual + 50) % 60).padStart(2, '0')
    slots.push({ inicio: `${h}:${m}`, fim: `${fH}:${fM}` })
    atual += 50
  }
  return slots
}

export default function Agendamento() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toasts, toast, removeToast } = useToast()
  usePageTitle('Agendar Consulta')

  const [pacientes, setPacientes] = useState([])
  const [slots, setSlots] = useState([])
  const [agendamentos, setAgendamentos] = useState([])
  const [profissional, setProfissional] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [etapa, setEtapa] = useState(1) // 1: paciente, 2: data, 3: horário, 4: confirmar
  const [selecionado, setSelecionado] = useState({
    paciente: null, data: '', diaSemana: '', horario: null
  })

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    try {
      const [pacRes, slotsRes, agRes] = await Promise.all([
        api.get('/patients/'),
        api.get('/schedule/availability/'),
        api.get('/appointments/'),
      ])
      setPacientes(pacRes.data)
      setSlots(slotsRes.data)
      setAgendamentos(agRes.data)

      // Busca dados da profissional via primeiro slot disponível
      if (slotsRes.data.length > 0) {
        setProfissional({ id: slotsRes.data[0].profissional_id })
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function horariosDisponiveisPorData(dataStr) {
    if (!dataStr) return []
    const diaSemana = DIAS_SEMANA[new Date(dataStr + 'T12:00:00').getDay()]
    const slotsDoDia = slots.filter(s => s.dia_semana === diaSemana)
    const horariosOcupados = agendamentos
      .filter(a => a.data === dataStr && a.status === 'agendado')
      .map(a => a.hora_inicio.slice(0, 5))

    return slotsDoDia.flatMap(s =>
      gerarHorarios(s.hora_inicio.slice(0, 5), s.hora_fim.slice(0, 5))
        .filter(h => !horariosOcupados.includes(h.inicio))
    )
  }

  async function confirmarAgendamento() {
    if (!profissional) {
      toast.error('Nenhuma profissional disponível')
      return
    }
    setSalvando(true)
    try {
      await api.post('/appointments/', {
        data: selecionado.data,
        hora_inicio: selecionado.horario.inicio + ':00',
        hora_fim: selecionado.horario.fim + ':00',
        patient_id: selecionado.paciente.id,
        profissional_id: profissional.id,
      })

      // Simula confirmação por e-mail
      toast.success(`Consulta agendada! Um e-mail de confirmação foi enviado para ${user.email}`)
      setTimeout(() => navigate('/responsavel'), 2000)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao agendar')
    } finally {
      setSalvando(false)
    }
  }

  const horariosDisponiveis = horariosDisponiveisPorData(selecionado.data)

  // Data mínima = hoje
  const hoje = new Date().toISOString().split('T')[0]

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
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-teal-200 text-xs font-medium mb-0.5">Área do Responsável</p>
            <h1 className="text-xl font-bold">Agendar Consulta</h1>
            <p className="text-teal-200 text-xs mt-1">Siga os passos para agendar uma consulta</p>
          </div>
          <button onClick={() => navigate('/responsavel')}
            className="text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-colors">
            ← Voltar
          </button>
        </div>
      </div>

      {/* Indicador de etapas */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          {['Paciente', 'Data', 'Horário', 'Confirmar'].map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i < 3 ? 'flex-1' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  etapa > i + 1 ? 'bg-teal-600 text-white'
                  : etapa === i + 1 ? 'bg-teal-700 text-white ring-2 ring-teal-300'
                  : 'bg-gray-200 text-gray-400'
                }`}>{etapa > i + 1 ? '✓' : i + 1}</div>
                <span className={`text-xs font-medium hidden sm:block ${etapa === i + 1 ? 'text-teal-700' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < 3 && <div className={`flex-1 h-px ${etapa > i + 1 ? 'bg-teal-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm">

          {/* Etapa 1 — Escolher paciente */}
          {etapa === 1 && (
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Selecione o paciente</h2>
              <p className="text-xs text-gray-400 mb-5">Para qual filho ou tutorado é a consulta?</p>
              {pacientes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">Nenhum paciente cadastrado.</p>
                  <button onClick={() => navigate('/responsavel')}
                    className="mt-3 text-teal-600 text-sm underline">
                    Cadastrar paciente
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pacientes.map(p => (
                    <button key={p.id} onClick={() => { setSelecionado({ ...selecionado, paciente: p }); setEtapa(2) }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-teal-300 hover:bg-teal-50 transition-all text-left">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-teal-700 font-bold">{p.nome.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{p.nome}</p>
                        <p className="text-xs text-gray-400">
                          Nasc: {new Date(p.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="ml-auto text-teal-400">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Etapa 2 — Escolher data */}
          {etapa === 2 && (
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Escolha a data</h2>
              <p className="text-xs text-gray-400 mb-5">
                Paciente: <strong>{selecionado.paciente?.nome}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Data da consulta</label>
                <input type="date" min={hoje}
                  value={selecionado.data}
                  onChange={e => setSelecionado({ ...selecionado, data: e.target.value, horario: null })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-gray-50"
                />
                {selecionado.data && horariosDisponiveis.length === 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
                    Não há horários disponíveis nesta data. Tente outro dia.
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setEtapa(1)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                  ← Voltar
                </button>
                <button
                  onClick={() => setEtapa(3)}
                  disabled={!selecionado.data || horariosDisponiveis.length === 0}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Etapa 3 — Escolher horário */}
          {etapa === 3 && (
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Escolha o horário</h2>
              <p className="text-xs text-gray-400 mb-5">
                {new Date(selecionado.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {horariosDisponiveis.map((h, i) => (
                  <button key={i}
                    onClick={() => setSelecionado({ ...selecionado, horario: h })}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      selecionado.horario?.inicio === h.inicio
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-100 hover:border-teal-200 text-gray-600'
                    }`}
                  >
                    {h.inicio}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setEtapa(2)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                  ← Voltar
                </button>
                <button onClick={() => setEtapa(4)} disabled={!selecionado.horario}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40">
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Etapa 4 — Confirmar */}
          {etapa === 4 && (
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Confirmar agendamento</h2>
              <p className="text-xs text-gray-400 mb-5">Verifique os dados antes de confirmar</p>

              <div className="bg-teal-50 border border-teal-100 rounded-xl p-5 space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paciente</span>
                  <span className="font-medium text-gray-800">{selecionado.paciente?.nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Data</span>
                  <span className="font-medium text-gray-800">
                    {new Date(selecionado.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Horário</span>
                  <span className="font-medium text-gray-800">{selecionado.horario?.inicio} – {selecionado.horario?.fim}</span>
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-sky-700">
                  📧 Ao confirmar, uma notificação será enviada para <strong>{user?.email}</strong>
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEtapa(3)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                  ← Voltar
                </button>
                <button onClick={confirmarAgendamento} disabled={salvando}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {salvando ? 'Agendando...' : '✓ Confirmar agendamento'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}