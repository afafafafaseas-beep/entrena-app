import { useEffect, useState } from 'react'
import { useObservable } from 'dexie-react-hooks'
import type { DXCAlert, DXCUserInteraction, SyncState, UserLogin } from 'dexie-cloud-addon'
import { db, nubeActiva } from '../db'
import { Icon } from './Icon'

/** Quién entró y cómo va la subida. Sin nube (pruebas), devuelve nada. */
export function useNube(): { usuario?: UserLogin; estado?: SyncState } {
  const usuario = useObservable(() => (nubeActiva ? db.cloud.currentUser : SIN_NUBE), [])
  const estado = useObservable(() => (nubeActiva ? db.cloud.syncState : SIN_NUBE), [])
  return { usuario: usuario ?? undefined, estado: estado ?? undefined }
}

// Observable vacío para cuando no hay nube.
const SIN_NUBE = {
  subscribe: (fn: (v: undefined) => void) => {
    fn(undefined)
    return { unsubscribe() {} }
  },
}

export function entrar() {
  if (nubeActiva) void db.cloud.login().catch(() => {})
}

export function textoEstado(usuario?: UserLogin, estado?: SyncState): string {
  if (!usuario?.isLoggedIn) return 'Entrá con tu mail y no perdés nada aunque cambies de celular.'
  if (!estado) return usuario.email ?? ''
  if (estado.license === 'expired') return 'La cuenta online venció: avisame.'
  switch (estado.phase) {
    case 'in-sync':
      return `Todo guardado online · ${usuario.email}`
    case 'pushing':
    case 'pulling':
    case 'initial':
    case 'not-in-sync':
      return 'Subiendo tus datos…'
    case 'offline':
      return 'Sin internet: se sube solo cuando vuelva.'
    case 'error':
      return 'No se pudo subir. Se reintenta solo.'
  }
}

const ERRORES: Record<string, string> = {
  INVALID_OTP: 'El código no es correcto o ya venció. Fijate el último mail que te llegó.',
  INVALID_EMAIL: 'Ese mail no parece válido. Revisalo.',
  LICENSE_LIMIT_REACHED: 'La cuenta online llegó al límite. Avisame.',
  NO_SEATS_AVAILABLE: 'La cuenta online llegó al límite. Avisame.',
  USER_NOT_REGISTERED: 'Ese mail no tiene permiso para entrar.',
  USER_NOT_ACCEPTED: 'Ese mail no tiene permiso para entrar.',
  USER_DEACTIVATED: 'Esa cuenta está desactivada.',
}

function textoAlerta(a: DXCAlert): string {
  if (a.type === 'error') return ERRORES[a.messageCode] ?? `No se pudo entrar. Probá de nuevo. (${a.message})`
  if (a.messageCode === 'OTP_SENT') return `Te mandamos un código a ${a.messageParams.email ?? 'tu mail'}. Fijate también en Spam o Promociones.`
  if (a.messageCode === 'LOGOUT_CONFIRMATION') return 'Hay cosas que todavía no se subieron. Si salís ahora, se pierden.'
  return a.message
}

/** Ventanita para entrar con el mail y el código (reemplaza la de Dexie, que está en inglés). */
export function VentanaEntrar() {
  const [inter, setInter] = useState<DXCUserInteraction>()
  const [valor, setValor] = useState('')
  useEffect(() => {
    if (!nubeActiva) return
    const s = db.cloud.userInteraction.subscribe((i) => {
      setInter(i)
      setValor('')
    })
    return () => s.unsubscribe()
  }, [])
  if (!inter) return null

  const campo = inter.type === 'email' ? 'email' : inter.type === 'otp' ? 'otp' : undefined
  const titulo =
    inter.type === 'email'
      ? 'Guardar todo online'
      : inter.type === 'otp'
        ? 'Poné el código'
        : inter.type === 'logout-confirmation'
          ? '¿Salir igual?'
          : 'Aviso'
  const boton =
    inter.type === 'email' ? 'Mandame el código' : inter.type === 'otp' ? 'Entrar' : inter.type === 'logout-confirmation' ? 'Salir igual' : 'Listo'

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (campo && !valor.trim()) return
    inter.onSubmit(campo ? { [campo]: valor.trim() } : {})
  }

  return (
    <div className="sheet-fondo" onClick={() => inter.onCancel()}>
      <form className="sheet" role="dialog" aria-label={titulo} onClick={(ev) => ev.stopPropagation()} onSubmit={enviar}>
        <div className="sheet__head">
          <p className="sheet__title">{titulo}</p>
          <button type="button" className="timer__cerrar" onClick={() => inter.onCancel()} aria-label="Cerrar">
            <Icon name="cerrar" size={20} />
          </button>
        </div>
        {inter.type === 'email' && (
          <p className="note">Te llega un código a tu mail, lo ponés acá y listo. No hay contraseña. Lo hacés una sola vez.</p>
        )}
        {inter.alerts.map((a, i) => (
          <p key={i} className={a.type === 'error' ? 'nube-alerta nube-alerta--error' : 'nube-alerta'} role={a.type === 'error' ? 'alert' : 'status'}>
            {textoAlerta(a)}
          </p>
        ))}
        {campo && (
          <label className="field">
            <span className="field__label">{campo === 'email' ? 'Tu mail' : 'Código'}</span>
            <input
              className="nube-input"
              type={campo === 'email' ? 'email' : 'text'}
              inputMode={campo === 'email' ? 'email' : 'text'}
              autoComplete={campo === 'email' ? 'email' : 'one-time-code'}
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
              placeholder={campo === 'email' ? 'tunombre@gmail.com' : ''}
              value={valor}
              onChange={(ev) => setValor(ev.target.value)}
            />
          </label>
        )}
        <button type="submit" className="btn btn--primary">
          {boton}
        </button>
        {inter.type !== 'message-alert' && (
          <button type="button" className="btn btn--ghost" onClick={() => inter.onCancel()}>
            {inter.type === 'logout-confirmation' ? 'Quedarme' : 'Ahora no'}
          </button>
        )}
      </form>
    </div>
  )
}
