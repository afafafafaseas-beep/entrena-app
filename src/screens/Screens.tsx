// Pantallas vacías de la Etapa 1. Cada una se completa en su etapa.

function Pronto({ etapa, children }: { etapa: number; children: React.ReactNode }) {
  return (
    <div className="card">
      <p className="card__tag">Llega en la etapa {etapa}</p>
      <p>{children}</p>
    </div>
  )
}

export function Hoy() {
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <>
      <h1>Hoy</h1>
      <p className="muted capital">{fecha}</p>
      <Pronto etapa={3}>Acá vas a ver qué día te toca y el botón grande para empezar.</Pronto>
    </>
  )
}

export function Entrenar() {
  return (
    <>
      <h1>Entrenar</h1>
      <Pronto etapa={3}>Acá vas a anotar kilos y reps de cada serie, el RPE, el descanso y cómo terminó la rodilla.</Pronto>
    </>
  )
}

export function Ejercicios() {
  return (
    <>
      <h1>Ejercicios</h1>
      <Pronto etapa={2}>Acá vas a tener la ficha de cada ejercicio: cómo se hace, para qué te sirve y su video.</Pronto>
    </>
  )
}

export function Progreso() {
  return (
    <>
      <h1>Progreso</h1>
      <Pronto etapa={4}>Acá vas a ver los gráficos de tus kilos, de la rodilla y el historial de sesiones.</Pronto>
    </>
  )
}

export function Mas() {
  return (
    <>
      <h1>Más</h1>
      <section className="card">
        <h2>Agregala a la pantalla de inicio</h2>
        <ol className="steps">
          <li>Abrí este link en <strong>Safari</strong>.</li>
          <li>Tocá el botón <strong>Compartir</strong> (el cuadrado con la flecha para arriba).</li>
          <li>Bajá y tocá <strong>Agregar a inicio</strong>.</li>
          <li>Tocá <strong>Agregar</strong>. Desde ahora abrila siempre desde ese ícono.</li>
        </ol>
        <p className="muted">
          Si la usás solo desde Safari y pasás 7 días sin abrirla, el iPhone puede borrar tus datos. Desde el ícono
          de inicio eso no pasa. Igual, cuando esté el backup, hacelo seguido.
        </p>
      </section>
      <Pronto etapa={2}>Cargar la rutina nueva del PF.</Pronto>
      <Pronto etapa={4}>Resumen para el PF, editar la rutina y backup de tus datos.</Pronto>
    </>
  )
}
