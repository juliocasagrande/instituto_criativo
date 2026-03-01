import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const profileConfig = {
  profissional: {
    bg: 'bg-indigo-700',
    badge: 'bg-indigo-500 text-indigo-50',
    label: 'Profissional',
    logoutHover: 'hover:bg-indigo-800',
  },
  responsavel: {
    bg: 'bg-teal-700',
    badge: 'bg-teal-500 text-teal-50',
    label: 'Responsável',
    logoutHover: 'hover:bg-teal-800',
  },
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const config = profileConfig[user?.tipo] || profileConfig.responsavel

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className={`${config.bg} px-6 py-2 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">IC</span>
        </div>
        <span className="font-semibold text-white text-sm">Instituto Criativo</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Nome clicável leva ao perfil */}
        <button
          onClick={() => navigate('/perfil')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <p className="text-sm font-medium text-white">{user?.nome}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
            {config.label}
          </span>
        </button>
        <button
          onClick={handleLogout}
          className={`text-xs text-white/70 hover:text-white transition-colors px-2.5 py-1 rounded-lg ${config.logoutHover}`}
        >
          Sair
        </button>
      </div>
    </nav>
  )
}