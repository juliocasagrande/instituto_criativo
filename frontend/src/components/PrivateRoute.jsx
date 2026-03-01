import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children, allowedType }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (allowedType && user.tipo !== allowedType) {
    return <Navigate to="/" replace />
  }

  return children
}