import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './toast-theme.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { content } from './constant.js'
import RequireAuth from './components/RequireAuth.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Reports from './pages/Reports.jsx'
import CreateGroup from './pages/CreateGroup.jsx'
import GroupDetail from './pages/GroupDetail.jsx'
import GroupSettings from './pages/GroupSettings.jsx'

export default function App() {
  // index.html carries the same description as a static fallback for
  // crawlers and social previews that never run this JS — keep it in sync
  // with constant.js by hand if it changes. The title itself is set per-route
  // by each page's useDocumentTitle() call, not here.
  useEffect(() => {
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', content.app.metaDescription)
  }, [])

  return (
    <AuthProvider>
      <ToastContainer
        position={content.toast.position}
        autoClose={content.toast.durationMs}
        theme="colored"
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAuth>
              <Reports />
            </RequireAuth>
          }
        />
        <Route
          path="/group/new"
          element={
            <RequireAuth>
              <CreateGroup />
            </RequireAuth>
          }
        />
        <Route
          path="/group/:id"
          element={
            <RequireAuth>
              <GroupDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/group/:id/settings"
          element={
            <RequireAuth>
              <GroupSettings />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
