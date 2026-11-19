import { Empty, Head } from '../components/ui'

export function Progreso() {
  return (
    <>
      <Head title="Progreso" />
      <Empty
        icon="progreso"
        title="Todavía sin gráficos"
        text="Acá vas a ver cómo suben tus kilos, cómo va la rodilla y todas tus sesiones."
        etapa={4}
      />
    </>
  )
}
