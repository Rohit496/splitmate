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
import Dashboard from './pages/Dashboard.jsx'
import CreateGroup from './pages/CreateGroup.jsx'
import GroupDetail from './pages/GroupDetail.jsx'

export default function App() {
  // index.html carries the same title/description as a static fallback for
  // crawlers and social previews that never run this JS — keep both in sync
  // with constant.js by hand if either one changes.
  useEffect(() => {
    document.title = content.app.name
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', content.app.metaDescription)
  }, [])

  return (
    <AuthProvider>
      <ToastContainer position={content.toast.position} autoClose={content.toast.durationMs} theme="colored" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
