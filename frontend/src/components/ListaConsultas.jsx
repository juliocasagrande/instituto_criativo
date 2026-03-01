import { useState } from 'react'
import api from '../services/api'

const STATUS_STYLE = {
  agendado:  { bg: 'bg-teal-50 border-teal-100',  badge: 'bg-teal-100 text-teal-700',  label: 'Agendado'  },
  cancelado: { bg: 'bg-red-50 border-red-100',    badge: 'bg-red-100 text-red-600',    label: 'Cancelado' },
  realizado: { bg: 'bg-gray-50 border-gray-100',  badge: 'bg-gray-100 text-gray-500',  label: 'Realizado' },
}

function addMinutes(timeStr, minutes) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function ListaConsultas({ consultas, onAtualizar, perfil, toast }) {
  const [cancelando, setCancelando] = useState(null)
  const [realizando, setRealizando] = useState(null)
  const [reagendando, setReagendando] = useState(null)
  const [novaData, setNovaData] = useState('')
  const [novoInicio, setNovoInicio] = useState('')

  async function cancelar(id) {
    if (!confirm('Deseja cancelar esta consulta?')) return
    setCancelando(id)
    try {
      await api.patch(`/appointments/${id}/cancelar/`)
      toast.success('Consulta cancelada')
      onAtualizar()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cancelar')
    } finally {
      setCancelando(null)
    }
  }

  async function marcarRealizada(id) {
    if (!confirm('Confirmar que esta consulta foi realizada?')) return
    setRealizando(id)
    try {
      await api.patch(`/appointments/${id}/realizar/`)
      toast.success('Consulta marcada como realizada!')
      onAtualizar()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar')
    } finally {
      setRealizando(null)
    }
  }

  async function reagendar(id) {
    if (!novaData || !novoInicio) {
      toast.error('Preencha a nova data e horário de início')
      return
    }
    const novoFim = addMinutes(novoInicio, 50)
    try {
      await api.patch(`/appointments/${id}/reagendar/`, {
        data: novaData,
        hora_inicio: novoInicio + ':00',
        hora_fim: novoFim + ':00',
      })
      toast.success('Consulta reagendada! Notificação enviada por e-mail.')
      setReagendando(null)
      setNovaData('')
      setNovoInicio('')
      onAtualizar()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao reagendar')
    }
  }

  if (consultas.length === 0) return (
    <div className="text-center py-10">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <span className="text-2xl">📅</span>
      </div>
      <p className="text-sm text-gray-400">Nenhuma consulta agendada ainda</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {consultas.map(c => {
        const style = STATUS_STYLE[c.status] || STATUS_STYLE.agendado
        const dataFormatada = new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        })

        return (
          <div key={c.id} className={`rounded-2xl border p-5 ${style.bg}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                    {style.label}
                  </span>
                  <span className="text-xs text-gray-400">{dataFormatada}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500 font-medium">
                    {c.hora_inicio.slice(0,5)} – {c.hora_fim.slice(0,5)}
                  </span>
                </div>
                <p className="font-semibold text-gray-800">{c.patient?.nome}</p>
                {perfil === 'profissional' && (
                  <p className="text-xs text-gray-400 mt-0.5">Responsável: {c.responsavel?.nome}</p>
                )}
                {c.observacoes && (
                  <p className="text-xs text-gray-400 mt-1 italic">{c.observacoes}</p>
                )}
              </div>

              {/* Ações para RESPONSÁVEL */}
              {c.status === 'agendado' && perfil === 'responsavel' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setReagendando(reagendando === c.id ? null : c.id); setNovaData(''); setNovoInicio('') }}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white transition-colors">
                    Reagendar
                  </button>
                  <button onClick={() => cancelar(c.id)} disabled={cancelando === c.id}
                    className="text-xs px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                    {cancelando === c.id ? '...' : 'Cancelar'}
                  </button>
                </div>
              )}

              {/* Ações para PROFISSIONAL */}
              {c.status === 'agendado' && perfil === 'profissional' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => marcarRealizada(c.id)} disabled={realizando === c.id}
                    className="text-xs px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                    {realizando === c.id ? '...' : '✓ Realizada'}
                  </button>
                  <button onClick={() => cancelar(c.id)} disabled={cancelando === c.id}
                    className="text-xs px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                    {cancelando === c.id ? '...' : 'Cancelar'}
                  </button>
                </div>
              )}
            </div>

            {/* Form de reagendamento inline */}
            {reagendando === c.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-3">Nova data e horário:</p>
                <div className="flex gap-3 flex-wrap items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]}
                      value={novaData} onChange={e => setNovaData(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Horário início</label>
                    <input type="time" value={novoInicio}
                      onChange={e => setNovoInicio(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                    />
                  </div>
                  {novoInicio && (
                    <p className="text-xs text-gray-400 self-end pb-2">Término: {addMinutes(novoInicio, 50)}</p>
                  )}
                  <button onClick={() => reagendar(c.id)}
                    className="bg-teal-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-teal-700 transition-colors self-end">
                    Confirmar
                  </button>
                  <button onClick={() => setReagendando(null)}
                    className="text-sm text-gray-400 hover:text-gray-600 px-2 self-end">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}