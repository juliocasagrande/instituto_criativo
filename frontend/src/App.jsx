import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import PainelProfissional from './pages/PainelProfissional'
import PainelResponsavel from './pages/PainelResponsavel'
import PainelAdmin from './pages/PainelAdmin'
import Agendamento from './pages/Agendamento'
import Perfil from './pages/Perfil'
import Historico from './pages/Historico'
import { safeJsonParse } from "./utils/storage"

const rawUser = localStorage.getItem("user")
const user = safeJsonParse(rawUser, null)

// se estava quebrado, limpa
if (rawUser && user === null && rawUser !== "null") {
  localStorage.removeItem("user")
}

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.tipo === 'profissional') return <Navigate to="/profissional" replace />
  if (user.tipo === 'admin')        return <Navigate to="/admin" replace />
  return <Navigate to="/responsavel" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/profissional" element={
            <PrivateRoute allowedType="profissional"><PainelProfissional /></PrivateRoute>
          } />

          <Route path="/responsavel" element={
            <PrivateRoute allowedType="responsavel"><PainelResponsavel /></PrivateRoute>
          } />

          <Route path="/admin" element={
            <PrivateRoute allowedType="admin"><PainelAdmin /></PrivateRoute>
          } />

          <Route path="/agendar" element={
            <PrivateRoute allowedType="responsavel"><Agendamento /></PrivateRoute>
          } />

          <Route path="/perfil" element={
            <PrivateRoute><Perfil /></PrivateRoute>
          } />

          <Route path="/historico/:pacienteId" element={
            <PrivateRoute><Historico /></PrivateRoute>
          } />

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}