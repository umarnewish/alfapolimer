import { useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthProvider.jsx'

let counter = 0

export default function TelegramLoginButton() {
  const { login } = useAuth()
  const containerRef = useRef(null)

  useEffect(() => {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME
    const callbackName = `onTelegramAuth_${counter++}`

    window[callbackName] = (telegramUser) => {
      login(telegramUser).catch((err) => {
        console.error('Telegram login failed', err)
        alert('Login failed. Please try again.')
      })
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '4')
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    script.setAttribute('data-request-access', 'write')

    containerRef.current?.appendChild(script)

    return () => {
      delete window[callbackName]
      containerRef.current?.replaceChildren()
    }
  }, [login])

  return <div ref={containerRef} />
}
