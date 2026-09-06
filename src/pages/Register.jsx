import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import AuthLayout from '../components/AuthLayout.jsx'
import { Button, Field, FormError, TextInput } from '../components/ui.jsx'

const copy = content.register

export default function Register() {
  const { isAuthenticated, register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  function update(key) {
    return (event) => {
      setForm((current) => ({ ...current, [key]: event.target.value }))
      setError('')
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const result = register(form)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(copy.successToast)
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout
      title={copy.title}
      intro={copy.intro}
      footer={
        <>
          {copy.footerPrompt}{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
            {copy.footerLink}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label={copy.nameLabel} id="register-name">
          <TextInput
            id="register-name"
            autoComplete="name"
            placeholder={copy.namePlaceholder}
            value={form.name}
            onChange={update('name')}
          />
        </Field>

        <Field label={copy.emailLabel} id="register-email">
          <TextInput
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            value={form.email}
            onChange={update('email')}
          />
        </Field>

        <Field label={copy.passwordLabel} id="register-password" hint={copy.passwordHint}>
          <TextInput
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder={copy.passwordPlaceholder}
            value={form.password}
            onChange={update('password')}
          />
        </Field>

        <FormError>{error}</FormError>

        <Button type="submit" className="mt-1 w-full gap-2">
          <UserPlus size={16} />
          {copy.submit}
        </Button>
      </form>
    </AuthLayout>
  )
}
