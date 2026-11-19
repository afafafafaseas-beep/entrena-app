import { Empty, Head } from '../components/ui'

export function Entrenar() {
  return (
    <>
      <Head title="Entrenar" />
      <Empty
        icon="entrenar"
        title="Nada en curso"
        text="Cuando empieces un entreno desde Hoy, lo seguís acá serie por serie."
        etapa={3}
      />
    </>
  )
}

export function Progreso() {
  return (
    <>
      <Head title="Progreso" />
      <Empty
        icon="progreso"
        title="Todavía sin datos"
        text="Acá vas a ver cómo suben tus kilos, cómo va la rodilla y todas tus sesiones."
        etapa={4}
      />
    </>
  )
}
