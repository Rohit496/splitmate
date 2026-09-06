import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import AuthLayout from '../components/AuthLayout.jsx'
import { Button, Field, FormError, TextInput } from '../components/ui.jsx'

const copy = content.forgotPassword

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const result = await requestPasswordReset({ email })
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(copy.sentToast)
    setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout title={copy.sentTitle} intro={copy.sentBody(email)}>
        <Link
          to="/login"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          {copy.backToSignIn}
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={copy.title}
      intro={copy.intro}
      footer={
        <>
          {copy.footerPrompt}{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:text-primary-hover"
          >
            {copy.footerLink}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label={copy.emailLabel} id="forgot-email">
          <TextInput
            id="forgot-email"
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

        <FormError>{error}</FormError>

        <Button type="submit" className="mt-1 w-full gap-2">
          <Mail size={16} />
          {copy.submit}
        </Button>
      </form>
    </AuthLayout>
  )
}
