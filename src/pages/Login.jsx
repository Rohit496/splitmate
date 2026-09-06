import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import AuthLayout from '../components/AuthLayout.jsx'
import { Button, Field, FormError, TextInput } from '../components/ui.jsx'

const copy = content.login

export default function Login() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    const result = await login({ email, password })
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(copy.welcomeToast)
    navigate(location.state?.from ?? '/dashboard', { replace: true })
  }

  return (
    <AuthLayout
      title={copy.title}
      intro={copy.intro}
      footer={
        <>
          {copy.footerPrompt}{' '}
          <Link
            to="/register"
            className="font-medium text-primary hover:text-primary-hover"
          >
            {copy.footerLink}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label={copy.emailLabel} id="login-email">
          <TextInput
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError('')
            }}
          />
        </Field>

        <Field label={copy.passwordLabel} id="login-password">
          <TextInput
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder={copy.passwordPlaceholder}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError('')
            }}
          />
        </Field>

        <div className="-mt-2 text-right">
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-primary hover:text-primary-hover"
          >
            {copy.forgotPasswordLink}
          </Link>
        </div>

        <FormError>{error}</FormError>

        <Button type="submit" className="mt-1 w-full gap-2">
          <LogIn size={16} />
          {copy.submit}
        </Button>
      </form>

      <div className="mt-5 border-t border-line pt-5">
        <p className="text-xs text-ink-muted">
          {copy.testAccountsIntro}{' '}
          <span className="num text-ink-soft">{copy.testAccountsPassword}</span>
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {copy.testAccounts.map((account) => (
            <button
              key={account}
              type="button"
              onClick={() => {
                setEmail(account)
                setPassword(copy.testAccountsPassword)
                setError('')
              }}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-primary hover:text-primary"
            >
              {account}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
