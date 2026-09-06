import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import AuthLayout from '../components/AuthLayout.jsx'
import { Button, Field, FormError, TextInput } from '../components/ui.jsx'

const copy = content.resetPassword

/**
 * Reached from the "forgot password" email link. supabaseClient.js's
 * detectSessionInUrl turns that link's token into a real (short-lived,
 * single-purpose) session before this ever renders — updatePassword() just
 * calls supabase.auth.updateUser() against it.
 */
export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (password !== confirm) {
      setError(copy.mismatchError)
      return
    }

    const result = await updatePassword({ password })
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(copy.successToast)
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout title={copy.title} intro={copy.intro}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label={copy.passwordLabel}
          id="reset-password"
          hint={copy.passwordHint}
        >
          <TextInput
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder={copy.passwordPlaceholder}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError('')
            }}
          />
        </Field>

        <Field label={copy.confirmLabel} id="reset-confirm">
          <TextInput
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            placeholder={copy.confirmPlaceholder}
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value)
              setError('')
            }}
          />
        </Field>

        <FormError>{error}</FormError>

        <Button type="submit" className="mt-1 w-full gap-2">
          <KeyRound size={16} />
          {copy.submit}
        </Button>
      </form>
    </AuthLayout>
  )
}
