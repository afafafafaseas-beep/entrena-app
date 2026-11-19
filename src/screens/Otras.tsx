import { Empty, Head } from '../components/ui'

export function Progreso() {
  return (
    <>
      <Head title="Progreso" />
      <Empty
        icon="progreso"
        title="Tu progreso, acá"
        text="Gráficos de tus kilos y de la rodilla, y el historial de cada sesión que guardes."
        pronto
      />
    </>
  )
}
