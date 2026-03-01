import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import { useToast } from '../components/useToast'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const STATUS_STYLE = {
  agendado:  { badge: 'bg-teal-100 text-teal-700',   dot: 'bg-teal-400',   label: 'Agendado'  },
  cancelado: { badge: 'bg-red-100 text-red-600',     dot: 'bg-red-400',    label: 'Cancelado' },
  realizado: { badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400', label: 'Realizado' },
}

function calcularIdade(dataNasc) {
  const hoje = new Date()
  const nasc = new Date(dataNasc + 'T00:00:00')
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function Historico() {
  const { pacienteId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toasts, toast, removeToast } = useToast()
  const isProfissional = user?.tipo === 'profissional'

  const [paciente, setPaciente] = useState(null)
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [editandoObs, setEditandoObs] = useState(null)
  const [textoObs, setTextoObs] = useState('')
  const [salvando, setSalvando] = useState(false)

  const voltar = isProfissional ? '/profissional' : '/responsavel'

  useEffect(() => { carregarDados() }, [pacienteId])

  async function carregarDados() {
    try {
      const [pacRes, histRes] = await Promise.all([
        api.get(`/patients/${pacienteId}/`),
        api.get(`/patients/${pacienteId}/historico/`),
      ])
      setPaciente(pacRes.data)
      setConsultas(histRes.data)
    } catch {
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }

  async function salvarObservacao(consultaId) {
    setSalvando(true)
    try {
      await api.patch(`/appointments/${consultaId}/observacoes/`, { observacoes: textoObs })
      toast.success('Observação salva!')
      setEditandoObs(null)
      carregarDados()
    } catch {
      toast.error('Erro ao salvar observação')
    } finally {
      setSalvando(false)
    }
  }

  // Estatísticas
  const stats = {
    total: consultas.length,
    realizadas: consultas.filter(c => c.status === 'realizado').length,
    agendadas: consultas.filter(c => c.status === 'agendado').length,
    canceladas: consultas.filter(c => c.status === 'cancelado').length,
  }

  const bannerBg = isProfissional ? 'bg-indigo-700' : 'bg-teal-700'
  const borderColor = isProfissional ? 'border-indigo-100' : 'border-teal-100'
  const ringColor = isProfissional ? 'focus:ring-indigo-400' : 'focus:ring-teal-400'
  const btnColor = isProfissional ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-600 hover:bg-teal-700'
  const subtleText = isProfissional ? 'text-indigo-200' : 'text-teal-200'

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isProfissional ? 'bg-indigo-50' : 'bg-teal-50'}`}>
      <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${isProfissional ? 'border-indigo-600' : 'border-teal-600'}`} />
    </div>
  )

  return (
    <div className={`min-h-screen ${isProfissional ? 'bg-indigo-50' : 'bg-teal-50'}`}>
      <Navbar />

      <div className="fixed top-5 right-5 z-50 space-y-2">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
      </div>

      {/* Banner */}
      <div className={`${bannerBg} text-white px-6 py-5`}>
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold">{paciente?.nome?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className={`${subtleText} text-xs font-medium mb-0.5`}>Histórico de Atendimentos</p>
              <h1 className="text-xl font-bold">{paciente?.nome}</h1>
              <p className={`${subtleText} text-xs mt-0.5`}>
                {calcularIdade(paciente?.data_nascimento)} anos ·
                Nasc: {paciente?.data_nascimento && new Date(paciente.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <button onClick={() => navigate(voltar)}
            className="text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-colors flex-shrink-0">
            ← Voltar
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Cards de resumo */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-white' },
            { label: 'Realizadas', value: stats.realizadas, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Agendadas', value: stats.agendadas, color: 'text-teal-600', bg: 'bg-teal-50' },
            { label: 'Canceladas', value: stats.canceladas, color: 'text-red-500', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 border ${borderColor} shadow-sm text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Observações do paciente */}
        {paciente?.observacoes && (
          <div className={`bg-white rounded-2xl p-5 border ${borderColor} shadow-sm`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Observações gerais</p>
            <p className="text-sm text-gray-600 italic">{paciente.observacoes}</p>
          </div>
        )}

        {/* Timeline de consultas */}
        <div className={`bg-white rounded-2xl border ${borderColor} shadow-sm overflow-hidden`}>
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800">Timeline de consultas</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ordenado do mais recente para o mais antigo</p>
          </div>

          {consultas.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-3xl">📋</span>
              <p className="text-sm text-gray-400 mt-3">Nenhuma consulta registrada ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {consultas.map((c, i) => {
                const style = STATUS_STYLE[c.status] || STATUS_STYLE.agendado
                const dataFormatada = new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })
                const isEditando = editandoObs === c.id

                return (
                  <div key={c.id} className="px-6 py-5">
                    <div className="flex items-start gap-4">
                      {/* Linha do tempo visual */}
                      <div className="flex flex-col items-center flex-shrink-0 mt-1">
                        <div className={`w-3 h-3 rounded-full ${style.dot} ring-2 ring-white ring-offset-1`} />
                        {i < consultas.length - 1 && (
                          <div className="w-px flex-1 bg-gray-100 mt-2 min-h-[2rem]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                            {style.label}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">{dataFormatada}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500 font-medium">
                            {c.hora_inicio.slice(0,5)} – {c.hora_fim.slice(0,5)}
                          </span>
                        </div>

                        {/* Observações */}
                        {!isEditando && (
                          <div className="flex items-start justify-between gap-3 mt-2">
                            {c.observacoes ? (
                              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 flex-1 italic">
                                "{c.observacoes}"
                              </p>
                            ) : (
                              <p className="text-xs text-gray-300 italic">Sem observações</p>
                            )}
                            {/* Botão editar obs — só profissional, só consultas realizadas */}
                            {isProfissional && c.status === 'realizado' && (
                              <button
                                onClick={() => { setEditandoObs(c.id); setTextoObs(c.observacoes || '') }}
                                className="text-xs text-gray-400 hover:text-indigo-600 flex-shrink-0 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">
                                {c.observacoes ? 'Editar' : '+ Anotação'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Form de edição de observação */}
                        {isEditando && (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={textoObs}
                              onChange={e => setTextoObs(e.target.value)}
                              rows={3}
                              autoFocus
                              placeholder="Adicione observações sobre este atendimento..."
                              className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ringColor} bg-gray-50 resize-none`}
                            />
                            <div className="flex gap-2">
                              <button onClick={() => salvarObservacao(c.id)} disabled={salvando}
                                className={`${btnColor} text-white text-xs px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50`}>
                                {salvando ? 'Salvando...' : 'Salvar'}
                              </button>
                              <button onClick={() => setEditandoObs(null)}
                                className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}