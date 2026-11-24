# App de gym de Santi — Instrucciones para Claude Code

Este archivo explica toda la app. Leelo entero antes de escribir código y volvé a leerlo cada vez que empieces una etapa nueva.

## 1. Para quién es

- Es para un solo usuario: Santi, 20 años, armador de vóley. Va al gym 3 veces por semana.
- Tuvo tendinitis en las dos rodillas, por eso anota cómo está la rodilla después de entrenar.
- Su rutina la arma un preparador físico (el "PF"), que es Claude en otro chat. La app no arma rutinas: las muestra, deja anotar lo que hace y arma un resumen para pasarle al PF.
- **Cargar la rutina por Santi (20/11):** el PF está en claude.ai, proyecto "PF VOLEY" (Santi tiene la sesión iniciada en el navegador integrado). Cuando pida "cargá la rutina", leer ahí solo los chats del PF (el JSON de la semana y los ajustes que dio después en el chat), pasar los ajustes tal cual los dijo el PF (no inventar reglas propias), revisarla con `revisarRutina` y subirla a su cuenta con `npx dexie-cloud@3.0.7 import` (realm = su mail, campo `owner` = su mail, `estado.rutinaActiva` = id de la rutina). Verificar con `export`. Los otros chats de Santi no se abren.
- Santi no usa la terminal. Todo lo que tenga que hacer él tiene que ser con clics, en GitHub o en el celular. Explicale cada paso en simple, en español rioplatense, sin palabras técnicas.

## 2. Qué hace la app (versión 1)

1. **Ver qué le toca hoy.** Muestra la rutina por días y bloques, y cuál es el próximo día.
2. **Marcar lo que hace, día tras día.** Para cada ejercicio anota kilos y repeticiones de cada serie, y la tilda. Ve lo que hizo la vez anterior en ese ejercicio.
3. **Ficha de cada ejercicio.** Explicación corta de cómo se hace, para qué le sirve, un botón para ver un video y la opción de sacarle una foto él mismo en el gym, que queda guardada en la ficha.
4. **Seguir su progreso.** Gráfico de los kilos por ejercicio a lo largo del tiempo e historial de sesiones.
5. **Rodilla.** Al terminar cada sesión anota cómo está la rodilla del 0 al 10, y ve un gráfico de eso.
6. **Cronómetro de descanso** entre series, que suena y vibra cuando termina.
7. **Resumen para el PF.** Un botón que arma el texto de la semana para copiarlo y pegárselo al PF.
8. **Cargar la rutina nueva del PF.** El PF le pasa la rutina en un bloque JSON. Santi lo pega en la app y queda cargada.

Nada más. Si se te ocurre algo extra, proponelo, pero no lo hagas sin que Santi diga que sí.

## 3. Reglas

- **Se usa en el gym con una mano.** Pensada para iPhone (390 px de ancho). Botones grandes (mínimo 44 px). Los campos de kilos y reps abren el teclado numérico.
- **Funciona sin internet** y se puede agregar a la pantalla de inicio del iPhone (PWA).
- **Nunca se pierden datos.** Todo se guarda en el celular apenas se toca. Si cierra la app en medio de una sesión, al volver la sesión sigue ahí. Hay un botón para copiar todos los datos (backup) y otro para restaurarlos.
- **Sin servidor propio y sin claves en el código.** El repositorio es público: nada de datos privados en el código.
  - **Cambio del 20/11 (lo pidió Santi):** los datos se guardan también online con **Dexie Cloud** (gratis hasta 3 usuarios, 100 MB) para no perder nada si se borra la app o cambia de celular, y para no depender de la PC. Se entra **una vez** con el mail y un código que llega por mail (sin contraseña). La app anda igual sin entrar y sin internet: guarda en el celular y sube cuando puede.
  - La dirección de la base (`src/nube.ts`) puede estar en el repo. La clave `dexie-cloud.key` y `dexie-cloud.json` **nunca** van al repo (están en .gitignore, quedan solo en la PC de Santi).
  - La base local ahora se llama `entrena-nube`. La vieja (`entrena`) se copia una sola vez al abrir y no se borra. Las rutinas tienen id de texto (`rut-...`; la base es siempre `rut-base`).
  - Tablas que **no** se suben: `local` (sesión en curso, descanso: cambian a cada toque) y `fotos` (pesan).
  - Los usuarios nuevos de Dexie Cloud son "de prueba" 30 días activos: hay que pasar a Santi a usuario de producción (gratis, entran 3) desde el Dexie Cloud Manager.
- **Todo en español rioplatense** ("tocá", "anotá", "te toca").
- **Fotos:** se guardan en el celular, achicadas a 1080 px de ancho como máximo para que no ocupen mucho.
- **Videos:** el botón abre una búsqueda de YouTube con el texto de la columna "Búsqueda de video" de la sección 8, más la palabra "exercise".
- **Fotos de los ejercicios** (cambio pedido por Santi el 20/11: "no sé de qué ejercicio se trata"): cada ejercicio muestra una foto de referencia animada (posición inicial ↔ final) de **free-exercise-db**, que es dominio público (Unlicense). Solo usar fuentes con licencia libre, nunca imágenes con derechos. El mapeo está en `src/data/fotos.json` y las fotos achicadas a 480 px en `public/ejercicios/`. Si un ejercicio no tiene foto libre, al lado aparece un botón de video. La foto que saca Santi reemplaza a la de referencia.

## 4. Cómo hacerla

- Vite + React + TypeScript.
- Datos en IndexedDB con Dexie (sesiones, rutina, fotos). Pedir `navigator.storage.persist()` al abrir.
- `vite-plugin-pwa` para instalarla y que ande sin internet.
  - **Actualizaciones en iPhone (20/11):** el instalador de la app tiene que ser chico. Si mete todo junto (antes eran 136 archivos y 3,5 MB con las fotos), el iPhone corta la descarga y se queda con la versión vieja. Por eso las fotos de `public/ejercicios/` NO van en el precache: se guardan aparte (CacheFirst) y se bajan de fondo al abrir la app. Sólo letras latinas de @fontsource. La app busca versión nueva al volver a primer plano y cada 30 min, y en Más > Buscar actualización se ve la versión y hay un botón para forzarla (borra la copia guardada de la app, nunca los datos).
- Zod para revisar el JSON de rutina que se pega.
- Gráficos simples en SVG o con Recharts.
- Vitest para probar la lógica.
- Publicación gratis en GitHub Pages con GitHub Actions, en cada cambio a `main`. Ojo: en `vite.config.ts` poné `base` con el nombre del repo (`/entrena-app/`). Si no, la página sale en blanco. Link de la app: https://afafafafaseas-beep.github.io/entrena-app/
- Las letras (Barlow y Barlow Condensed) van dentro de la app con `@fontsource`, no desde Google Fonts, para que se vean sin internet.
- En la PC de Santi el proyecto está en `E:\Proyectos\entrena-app` (no en `E:\PROYECTOS CLAUDE`, que es de solo lectura). Git está en `C:\Program Files\Git\cmd\git.exe`.
- En iPhone, Safari puede borrar los datos de una página que no está en la pantalla de inicio si no se usa en 7 días. En la pantalla "Más", explicá cómo agregarla al inicio (Compartir → Agregar a inicio) y recordá hacer el backup.

## 5. Pantallas (barra de abajo con 5 pestañas)

**Hoy**
- Fecha y "Te toca: Día 2" con un botón grande "Empezar". El próximo día es el que sigue al último que hizo (Día 1 → 2 → 3 → 1).
- Si hay una sesión sin terminar: botón "Seguir sesión".
- Cuántas veces fue al gym esta semana (de lunes a domingo) y cómo terminó la rodilla la última vez.
- Si todavía está cargada la rutina vieja (sección 9), un aviso: "Cargá la rutina nueva del PF en Más".

**Entrenar** (la pantalla más importante)
- Arriba: nombre del día y cuánto tiempo lleva la sesión.
- Los bloques en orden. Bloques de tipo `movilidad`: solo una lista con un botón para tildar cada ejercicio. Bloques de tipo `fuerza`: por cada ejercicio, una fila por serie con kilos, reps y un botón ✓.
- Los campos vacíos muestran de fondo (placeholder) lo que hizo la vez anterior, o si no hay, lo que dice la rutina. Si toca ✓ con los campos vacíos, se copian esos valores.
- Debajo de cada ejercicio: "Última vez (20/11): 50×4 · 55×4 · 55×4".
- Tocar el nombre de un ejercicio abre su ficha.
- RPE de cada ejercicio con botones del 6 al 10 (qué tan duro fue: 10 = no podía más). Debajo de la pantalla, una línea que explique el RPE.
- Botón flotante "Descanso": 60, 90, 120 o 180 segundos. Muestra la cuenta regresiva grande, botón "+30 seg" y "Listo". Al terminar suena y vibra (ojo: en iPhone las apps web no pueden vibrar, así que ahí solo suena y la barra se pone naranja; si el iPhone está en silencio o bloqueado puede no sonar).
- Mientras hay una sesión abierta, la pantalla no se apaga sola (Wake Lock). Santi dijo que sí el 19/11.
- La sesión en curso se guarda en la tabla `estado` (clave `sesionEnCurso`) a cada toque; el descanso en `estado.descanso`.
- Al final: rodilla al terminar (0 a 10, con colores: verde 0-3, amarillo 4-5, rojo 6-10), qué tan dura fue la sesión (RPE 5 a 10), notas, "Guardar sesión" y "Descartar".

**Ejercicios**
- Buscador y filtro por zona del cuerpo (columna "Zonas" de la sección 8).
- Cada ejercicio se abre y muestra: cómo se hace, para qué le sirve, botón "Ver video", su foto si tiene, y botón "Sacar foto / Cambiar foto".
- Marca en qué día de su rutina aparece cada ejercicio.
- Si la rutina del PF trae un ejercicio que no está en la lista, igual se muestra con su botón de video, y se puede agregar a la lista escribiendo cómo se hace.

**Progreso**
- Elegir un ejercicio y ver un gráfico del peso más alto de cada sesión.
- Gráfico de la rodilla al terminar cada sesión.
- Sesiones por semana (últimas 8 semanas).
- Historial de sesiones, que se abren para ver el detalle, con opción de borrar.

**Más**
- **Cargar rutina del PF:** un botón "Elegir archivo" (el PF a veces la pasa como archivo descargable: se lee y se revisa solo) y un cuadro para pegar el JSON (que funcione aunque peguen el mensaje entero del PF: buscar desde la primera `{` hasta la última `}`). Botón "Revisar" que muestra "Semana 1: 3 días, 54 ejercicios" o el error en criollo ("Al bloque Potencia 1 del Día 2 le falta decir cuántas vueltas"). Después, "Cargar esta rutina".
- **Resumen para el PF** de los últimos 7, 14 o 28 días, con botón "Copiar" (formato en la sección 7).
- **Rutina actual:** verla y tocar un ejercicio para cambiar series, reps, peso o nota.
- **Rutinas anteriores:** poder volver a una.
- **Backup:** "Copiar todos mis datos" y "Restaurar". Las fotos no entran en el backup de texto: avisarlo.
- Cómo agregar la app a la pantalla de inicio.

## 6. Datos

```ts
interface Rutina { nombre: string; semana?: number; notas?: string; dias: Dia[] }
interface Dia { id: string; nombre: string; foco?: string; bloques: Bloque[] }
interface Bloque { nombre: string; tipo: "movilidad" | "fuerza"; vueltas: number; ejercicios: Prescripto[] }
interface Prescripto { nombre: string; series?: number; reps: string; carga?: string; rpe?: string; descanso?: string; nota?: string }
// series de un ejercicio = "series" si está, si no las "vueltas" del bloque

interface Sesion {
  id: string; fecha: string; inicio: number; fin: number; minutos: number;
  diaId: string; diaNombre: string; rutinaNombre: string;
  ejercicios: { nombre: string; bloque: string; tipo: "movilidad" | "fuerza"; hecho: boolean;
                series: { kg?: number; reps?: number; ok: boolean }[]; rpe?: number }[];
  rodilla?: number; rpeSesion?: number; notas?: string;
}
interface Foto { ejercicio: string; blob: Blob; fecha: number }
```

Los nombres de ejercicios se comparan sin importar mayúsculas ni tildes.

## 7. Formato del "Resumen para el PF"

```
RESUMEN PARA MI PF · del 17/11 al 23/11
Rutina: Semana 1 · Re-entrada

GYM (3 sesiones)
- lun 17/11 · Día 1 · 68 min · RPE 7 · rodilla al terminar 2
  · Sentadilla trasera: 50×4, 55×4, 55×4 (RPE 7)
  · Press banca: 40×3, 45×3, 45×3 (RPE 6)
  · Calentamiento: 8 de 8 ejercicios
  Notas: ...

COMPARADO CON EL PERÍODO ANTERIOR
- Sentadilla trasera: peso máximo 55 kg (antes 50)
- Rodilla al terminar (promedio): 2,3 (antes 2,8)
```

## 8. Lista de ejercicios

Usá esta lista tal cual para las fichas. Zonas posibles: rodilla, tobillo, cadera, piernas, posterior (isquios y glúteos), core, hombro, empuje, traccion (espalda), potencia, salto, movilidad, acondicionamiento.

| Nombre | Búsqueda de video | Zonas | Cómo se hace | Para qué te sirve |
| --- | --- | --- | --- | --- |
| Sóleo + rodilla isométrico | seated soleus isometric | rodilla, tobillo | Sentado con la rodilla a 90° y peso sobre el muslo, empujá con la planta como si subieras el talón y sostené. | Carga el tendón y el sóleo sin impacto. Es la base para la tendinopatía. |
| Isométrico de isquios | hamstring bridge isometric hold | posterior, rodilla | Boca arriba con los talones en un banco, subí la cadera y sostené apretando los isquios. | Isquios fuertes frenan mejor y cuidan la rodilla al aterrizar. |
| Elevación de sóleo isométrica | seated soleus raise | tobillo, rodilla | Sentado con peso sobre las rodillas, subí los talones y sostené arriba. | El sóleo absorbe gran parte del impacto del salto. |
| Nórdicos con banda | banded nordic curl | posterior | De rodillas con los tobillos trabados, bajá el torso lo más lento posible con la banda ayudándote. | Isquios fuertes en el frenado: previene desgarros. |
| Sentadilla isométrica con talones elevados | heel elevated isometric squat | rodilla | Talones sobre un disco, mancuerna al pecho, bajá a 70-90° y sostené. | Isométrico clásico que baja el dolor rotuliano y fortalece el tendón. |
| Spanish squat | spanish squat patellar tendon | rodilla | Banda pesada detrás de las rodillas atada al rack. Cola atrás, tronco recto, bajá y sostené. | Mucho cuádriceps con poca presión en la rodilla. |
| Wall sit | wall sit | rodilla | Espalda contra la pared, rodillas a 60-90°, sostené. | Isométrico simple para el tendón, sin equipo. |
| Decline squat excéntrico | decline squat eccentric patellar tendon | rodilla | En una tabla inclinada, bajá en 3-4 segundos y subí con las dos piernas. | Fortalece el tendón en la fase que más carga al frenar. |
| Tibialis raise | tibialis raise | tobillo | Espalda en la pared y talones adelante, levantá las puntas de los pies. | Tobillo más estable al caer. |
| Elevación de gemelos en máquina | standing machine calf raise | tobillo | Rodillas estiradas, subí al máximo y bajá lento. | Más impulso de tobillo en el salto. |
| Estiramiento de dorsiflexión semiarrodillado | half kneeling ankle dorsiflexion stretch | tobillo, movilidad | Semiarrodillado, llevá la rodilla de adelante hacia adelante sin levantar el talón. | Tobillo móvil reparte mejor la carga y protege la rodilla. |
| Extensión torácica arrodillado con PVC | kneeling thoracic extension pvc bench | movilidad, hombro | Arrodillado, codos en un banco agarrando un palo, llevá el pecho hacia el piso. | Para armar y rematar arriba de la cabeza sin forzar el hombro. |
| Shin box a extensión de cadera | shin box to hip extension | cadera | Sentado en 90/90, empujá la cadera hacia arriba y adelante hasta quedar arrodillado. | Rotación de cadera con glúteo activo. |
| Bisagra de cadera con deslizamiento a 1 pierna | single leg hip hinge slider | cadera, posterior | Una pierna desliza hacia atrás mientras bajás el torso con la espalda recta. | Bisagra y equilibrio en una pierna. |
| Sentadilla profunda con rotación torácica | deep squat thoracic rotation | movilidad, cadera | En sentadilla profunda, abrí un brazo al techo girando el tronco. Alterná. | Cadera, tobillo y espalda a la vez. |
| Hip airplane asistido | supported hip airplane | cadera | Parado en una pierna agarrado de algo, girá la pelvis abriendo y cerrando sobre esa cadera. | Cadera estable para caer en una pierna. |
| DNS side sit to bear | dns side sit to bear | core, movilidad | Desde sentado de costado, pasá a cuatro apoyos con las rodillas apenas despegadas del piso. | Control del core al cambiar de posición. |
| Waterball lift semiarrodillado | half kneeling water ball lift | core | Semiarrodillado, llevá la pelota de agua en diagonal de la cadera hacia arriba sin que el tronco se mueva. | Core antirrotación. |
| Open book de costado | side lying open book | movilidad | De costado con las rodillas flexionadas, abrí el brazo de arriba girando el pecho al techo. | Rotación de espalda para el brazo de remate. |
| Estiramiento de cadera boca arriba | supine figure 4 stretch | cadera | Boca arriba, cruzá un tobillo sobre la otra rodilla y llevá las piernas al pecho. | Glúteo y cadera sueltos. |
| Aductor en cuadrupedia con rotación torácica | quadruped adductor rock thoracic rotation | cadera, movilidad | En cuatro apoyos con una pierna estirada al costado, llevá la cola atrás y girá el tronco. | Desplazamientos laterales más libres. |
| Shin box con roll y get up | shin box get up | cadera | Desde 90/90 cambiá de lado rodando las piernas y levantate, sin manos si podés. | Movilidad y control de cadera. |
| Estocada con rotación | lunge with rotation | piernas, movilidad | Estocada adelante y girá el tronco hacia la pierna de adelante. | Calienta piernas y tronco juntos. |
| CARS de cadera | hip cars | cadera | Círculos lentos y lo más grandes posible con la rodilla, sin mover la pelvis. | Rango de cadera controlado. |
| Knee hug a estocada con codo al empeine | knee hug to lunge elbow to instep | movilidad | Abrazá una rodilla, da un paso a estocada y llevá el codo al empeine. | Calentamiento dinámico de cadera e isquios. |
| Bird dog con alcance | bird dog | core | En cuatro apoyos, estirá brazo y pierna opuestos sin mover la cadera. Alterná. | Zona lumbar estable. |
| Estiramiento lateral lumbar | standing lateral trunk stretch | movilidad | Inclinate de costado estirando todo el lateral del tronco. | Afloja la zona lumbar antes de cargar. |
| Rotación torácica semiarrodillado con KB | half kneeling thoracic rotation kettlebell | movilidad | Semiarrodillado con la pesa al pecho, girá el tronco hacia la pierna de adelante. | Rotación de espalda con carga liviana. |
| Rotaciones de cadera de pie | standing hip rotations supported | cadera | Agarrado de algo, levantá la rodilla y abrí la cadera hacia afuera en círculo. | Cadera móvil en posición de juego. |
| Spiderman | spiderman stretch | cadera, movilidad | Desde plancha, llevá el pie al lado de la mano y bajá la cadera. | Flexores de cadera y aductores. |
| Miniband en 3 direcciones | mini band 3 way hip | cadera | Con la banda en los tobillos, llevá la pierna adelante, al costado y atrás sin mover el tronco. | Glúteo medio: rodilla alineada al caer. |
| Peso muerto rumano a 1 pierna con barra | single leg romanian deadlift barbell | posterior | En una pierna, bajá el torso llevando la otra pierna atrás, con la cadera derecha. | Isquios, glúteo y equilibrio. |
| Deadbug | dead bug exercise | core | Boca arriba, bajá brazo y pierna opuestos sin despegar la lumbar del piso. | Core profundo. |
| Gateo de oso | bear crawl | core, hombro | Gateá con las rodillas a 2 cm del piso y la espalda quieta. | Core y hombros juntos. |
| Estocada lateral | lateral lunge | piernas, cadera | Paso al costado, cola atrás, una pierna flexionada y la otra estirada. | Fuerza para defender de costado. |
| Estocada atrás + world's greatest stretch | worlds greatest stretch | movilidad | Estocada atrás, mano al piso, codo al empeine y abrí el brazo al techo. | Calentamiento completo en un movimiento. |
| Gato-camello | cat camel | movilidad | En cuatro apoyos, arqueá y redondeá la espalda despacio. | Moviliza la columna antes de cargar. |
| Sentadilla con miniband | mini band squat | piernas | Sentadilla con la banda arriba de las rodillas, empujándola hacia afuera. | Evita que las rodillas se vayan hacia adentro. |
| Sentadilla goblet | goblet squat | piernas | Mancuerna al pecho, sentadilla profunda con el pecho arriba. | Patrón de sentadilla y calentamiento de piernas. |
| Rotación interna de cadera | hip internal rotation exercise | cadera | En 90/90 o acostado, girá la cadera hacia adentro con control. | La rotación interna suele faltar y sobrecarga la rodilla. |
| Shin box rotación interna/externa | 90 90 hip switch | cadera | Sentado en 90/90, pasá las rodillas de un lado al otro. | Rotación de cadera activa. |
| YTWLI en el piso | prone ytwl | hombro | Boca abajo, formá Y, T, W, L e I con los brazos despegando del piso, con pesitos. | Omóplato y manguito: hombro sano para rematar y sacar. |
| Flexiones escapulares | scapular push up | hombro | En plancha con los brazos rectos, juntá y separá los omóplatos. | Activa el serrato. |
| Overhead carry a 1 brazo con KB invertida | bottoms up kettlebell overhead carry | hombro, core | Caminá con la pesa invertida arriba de la cabeza, brazo firme y costillas abajo. | Hombro estable arriba de la cabeza. |
| Wall march de serrato con miniband | mini band serratus wall march | hombro | Antebrazos en la pared con la banda, subí un brazo y después el otro empujando la pared. | Serrato y control del omóplato. |
| Dominada escapular | scapular pull up | hombro, traccion | Colgado de la barra, bajá y subí los hombros sin doblar los codos. | Activa la espalda que estabiliza el hombro. |
| Press de serrato con mancuerna boca arriba | supine serratus punch dumbbell | hombro | Boca arriba con la mancuerna arriba, empujá al techo despegando el omóplato del banco. | Omóplato estable al rematar. |
| Band pull apart unilateral | single arm band pull apart | hombro | Banda al frente, abrí un brazo hacia atrás juntando el omóplato. | Hombro de atrás fuerte para equilibrar tanto empuje. |
| Ws en el piso | prone w raise | hombro | Boca abajo con los brazos en W, despegá codos y manos del piso y sostené. | Rotadores externos del hombro. |
| Wall slide de serrato | serratus wall slide | hombro | Antebrazos en la pared, deslizá hacia arriba empujando la pared. | Subir el brazo con buena mecánica. |
| CARS de hombro | shoulder cars | hombro | Círculos lentos y máximos con el brazo, el resto del cuerpo quieto. | Rango de hombro controlado. |
| Rotación externa de hombro de costado a 45° | side lying shoulder external rotation | hombro | De costado, codo pegado con una toalla, girá el antebrazo hacia arriba con una mancuerna liviana. | Manguito rotador: frena el brazo después del remate. |
| Rotación interna de hombro en polea | cable shoulder internal rotation | hombro | Codo pegado al cuerpo, girá el antebrazo hacia adentro contra la polea. | Rotación interna del remate, controlada. |
| Ángeles boca abajo | prone snow angels | hombro | Boca abajo con los brazos despegados, llevalos de la cadera a la cabeza y vuelta. | Omóplato y hombro de atrás. |
| Elevación en T boca abajo | prone t raise | hombro | Boca abajo, abrí los brazos en T con los pulgares arriba. | Espalda alta fuerte. |
| Decoaptación de hombro con KB | shoulder distraction kettlebell | hombro | Inclinado con apoyo, dejá colgar una pesa pesada aflojando el hombro y después estabilizá. | Descomprime y activa el hombro. |
| Retracción escapular | scapular retraction exercise | hombro | Inclinado con apoyo, juntá el omóplato hacia atrás sin doblar el codo. | Omóplato estable. |
| Rotaciones de hombro en pared | wall shoulder rotation | hombro | De costado a la pared con el codo apoyado, girá el brazo arriba y abajo. | Rotación de hombro activa. |
| Fuerza de dedos y muñeca | finger wrist strengthening volleyball setter | hombro | Apretá una pelota de goma y hacé flexión y extensión de muñeca con una mancuerna liviana. | Manos firmes para armar y menos esguinces de dedos. |
| Pallof press | pallof press | core | De costado a la polea o banda, empujá las manos al frente sin dejar que el tronco gire. | Pasa la fuerza de las piernas al brazo. |
| Rueda abdominal | ab wheel rollout | core | De rodillas, rodá hacia adelante sin hundir la lumbar y volvé. | Core fuerte para rematar y saltar. |
| Stir the pot en pelota | stir the pot stability ball | core | Plancha con los antebrazos en la pelota, hacé círculos chiquitos. | Estabilidad del core. |
| Rotación torácica semiarrodillado (core) | half kneeling thoracic rotation | core, movilidad | Semiarrodillado, girá el tronco con control desde el abdomen. | Rotación del remate. |
| Pullover a crunch con disco | plate pullover crunch | core | Boca arriba, llevá el disco detrás de la cabeza y volvé hacia las rodillas con abdominal. | Une dorsal y abdomen como en el remate. |
| Floor scorpion | prone scorpion stretch | cadera, movilidad | Boca abajo, llevá un pie hacia la mano contraria girando la cadera. | Cadera y columna sueltas. |
| Halo con KB de rodillas | tall kneeling kettlebell halo | hombro, core | De rodillas, girá la pesa alrededor de la cabeza con el tronco firme. | Hombro y core. |
| Plancha a T | plank to t rotation | core, hombro | Desde plancha, abrí un brazo al techo pasando a plancha lateral. | Core y hombro. |
| Copenhagen plank | copenhagen plank | cadera, core | Plancha lateral con la pierna de arriba apoyada en un banco. | Aductores fuertes, menos lesiones de ingle. |
| Hang power clean | hang power clean | potencia | Barra a mitad de muslo, extendé cadera y rodillas explosivo y recibí en media sentadilla. | Explosión de cadera como en el salto. |
| Power clean a 1 pierna | single leg dumbbell power clean | potencia | Cargada explosiva parado en una pierna, con peso liviano. | Potencia de una pierna, como el despegue. |
| Clean high pull con trap bar | trap bar high pull | potencia | Con la trap bar, extendé explosivo tirando hacia arriba, sin recibir. | Potencia de piernas con poca técnica. |
| Clean high pull desde el piso | clean high pull | potencia | Desde el piso, tirón explosivo de la barra hasta el pecho. | Velocidad de cadera. |
| Landmine split jerk | landmine split jerk | potencia, empuje | Barra de landmine al hombro, impulso de piernas y empujá cayendo en tijera. | Fuerza de piernas que llega al brazo, como en el remate. |
| Salto SJ cargado con barra | barbell squat jump | salto, potencia | Barra liviana en la espalda, bajá a 90°, pausa y saltá explosivo. Caé suave. | Más potencia de despegue. |
| Saltos sentado desde banco con mancuernas | seated box jump dumbbells | salto | Sentado en un cajón con mancuernas, saltá explosivo desde sentado. | Potencia sin rebote. |
| Slam con pelota medicinal | medicine ball slam | potencia | Llevá la pelota arriba y estrellala contra el piso con todo. | Potencia del gesto de remate. |
| Lanzamiento de pelota medicinal sobre la cabeza | overhead medicine ball throw | potencia | Desde arriba de la cabeza, lanzá la pelota a la pared con un paso adelante. | Velocidad de brazo para sacar y rematar. |
| Lanzamiento rotacional de pelota medicinal | rotational medicine ball throw | potencia, core | De costado a la pared, girá desde la cadera y lanzá. | Potencia de tronco. |
| Sentadilla trasera | back squat | piernas | Barra en la espalda, bajá controlado al menos a paralelo con las rodillas siguiendo las puntas. | Fuerza base del salto. |
| Press banca | bench press | empuje | Omóplatos juntos, bajá la barra al pecho controlado y empujá explosivo. | Fuerza de empuje del tren superior. |
| Peso muerto rumano | romanian deadlift | posterior | Rodillas apenas flexionadas, bajá la barra pegada a las piernas llevando la cola atrás. | Isquios y glúteos: potencia y cuidado de rodilla. |
| Step up lateral con barra | lateral step up barbell | piernas | Barra en la espalda, cajón al costado, subí empujando con la pierna de arriba. | Fuerza de una pierna y lateral. |
| Remo Pendlay | pendlay row | traccion | Torso paralelo al piso, tirá la barra del piso al abdomen explosivo con la espalda recta. | Espalda fuerte que equilibra el empuje y cuida el hombro. |
| Press landmine a 1 brazo semiarrodillado | half kneeling landmine press | empuje, hombro | Semiarrodillado, empujá la barra de landmine arriba con un brazo, costillas abajo. | Empuje hacia arriba amigable con el hombro. |
| Hip thrust | barbell hip thrust | posterior | Espalda en un banco y barra en la cadera, subí apretando glúteos. | Glúteo fuerte = más extensión en el salto. |
| Peso muerto con trap bar | trap bar deadlift | piernas, posterior | Dentro de la trap bar, empujá el piso y extendé cadera y rodillas juntas. | Fuerza total con menos carga en la espalda. |
| Press Z | z press | empuje, hombro | Sentado en el piso sin respaldo, press de hombros. | Empuje con core estricto. |
| Pullover a extensión con mancuerna | dumbbell pullover to extension | traccion, empuje | Pullover con mancuerna y al volver estirá los codos. | Dorsal y tríceps del remate. |
| Flexiones en banco | incline push up | empuje | Flexiones con las manos apoyadas en un banco. | Empuje con hombro estable. |
| Dominadas con pies apoyados | feet assisted pull up | traccion | Dominada con los pies en el piso o en un cajón para ayudarte. | Tracción regulable. |
| Dominadas | pull up | traccion | Colgado, subí hasta pasar el mentón y bajá controlado. | Dorsal para el remate. |
| Remo con mancuernas pecho apoyado | chest supported dumbbell row | traccion | Pecho apoyado en un banco inclinado, remá con mancuernas. | Espalda sin cargar la lumbar. |
| Peso muerto rumano a 1 pierna con mancuerna | single leg rdl contralateral dumbbell | posterior | En una pierna, con la mancuerna en la mano contraria. | Isquios y estabilidad. |
| Sentadilla búlgara | bulgarian split squat | piernas | Pie de atrás en un banco, bajá con la rodilla de adelante siguiendo la punta. | Fuerza de una pierna para despegar. |
| Salto al cajón a 1 pierna | single leg box jump | salto | Saltá en una pierna arriba del cajón, caé suave y bajá caminando. | Despegue de una pierna sin el impacto de la caída. |
| Drop jump a box jump | drop jump to box jump | salto | Dejate caer de un cajón bajo y rebotá rápido arriba de otro cajón. | Usar el rebote para saltar más. |
| Drop jump batida 2 tiempos | drop jump approach jump | salto | Caída desde cajón y batida en 2 tiempos como en el ataque, salto máximo. | Lleva la reactividad al gesto de ataque. |
| Box jump con contramovimiento cargado | eccentric loaded box jump dumbbell release | salto | Con mancuernas, bajá rápido, soltalas y saltá al cajón. | Contramovimiento más potente. |
| Pogo hops a 1 pierna | single leg pogo hops | salto, tobillo | Saltitos rápidos en una pierna, tobillo duro y poco contacto con el piso. | Tobillo reactivo. |
| Pogo jumps | pogo jumps | salto, tobillo | Saltitos rápidos con las dos piernas. | Reactividad de tobillo. |
| Pogo hops en estocada | split pogo hops | salto | Saltitos rápidos en posición de estocada. | Reactividad en posición asimétrica. |
| Squatty hops | squat hops | salto | Saltitos cortos en media sentadilla. | Piernas que aguantan en posición baja. |
| Squat jumps continuos | continuous squat jumps | salto | Saltos de sentadilla seguidos: caer y rebotar. | Potencia repetida. |
| Flexiones pliométricas | plyometric push up | empuje | Flexiones explosivas despegando las manos. | Potencia de empuje. |
| Salto con carrera de ataque | volleyball approach jump | salto | Carrera de ataque completa y salto máximo tocando lo más alto posible. | Es el gesto real: ahí medís tu alcance. |
| Salto horizontal | broad jump | salto | Salto en largo con las dos piernas y caída firme. | Potencia y aterrizaje. |
| Aterrizajes | snap down landing drill | salto, rodilla | Desde puntas, caé rápido en posición atlética y quedate firme 2 segundos. | Aprender a caer protege las rodillas. |
| Intervalos tipo rally | volleyball conditioning intervals | acondicionamiento | 5 a 10 segundos explosivos (saltos o desplazamientos) y 15 a 20 de pausa, de 8 a 12 veces. | Repetir esfuerzos como en un partido largo. |
| Desplazamientos 9-3-6-9 | volleyball 9 3 6 9 sprint drill | acondicionamiento | Ida y vuelta a las líneas de 3, 6 y 9 metros a máxima velocidad. | Velocidad en las distancias del vóley. |

**Ejercicios y nombres que agregó el PF.** La rutina real del PF ("Semana 1 · Re-entrada", copia en `src/data/pf-semana1.json`) trajo ejercicios nuevos y otros nombres para ejercicios de esta lista ("Nordic curls con banda", "Iso hold isquios", "Peso muerto rumano con barra"…). Los nuevos y los otros nombres están en `src/data/catalogo-extra.json`. La app encuentra la ficha por nombre exacto, por otro nombre conocido o por el nombre de la lista más algo al final. Un test verifica que todos los ejercicios de esa rutina tengan ficha: si llega una rutina nueva con nombres raros, agregalos ahí.

**Qué se anota en cada serie** (se decide solo con lo que dice la rutina): kilos si la carga dice kg; reps, o segundos si las reps dicen "seg"; centímetros si la nota dice "anotar ... cm" (tests de salto); solo tildar si son intervalos ("8 seg fuerte / 40 seg suave"). Si el ejercicio trae descanso ("2 min", "1 min 30"), tiene un botón para arrancarlo directo.

## 9. Rutina que viene cargada

Es la última rutina del PF anterior, con los pesos de ANTES de que Santi dejara el gym. Se carga sola si no hay otra. Mientras sea esta, mostrar el aviso de la pantalla Hoy.

```json
{"nombre":"Rutina base del PF (cargas de antes de parar)","semana":0,"notas":"No arranques con estas cargas: importá la semana de re-entrada del PF.","dias":[
{"id":"d1","nombre":"Día 1","foco":"Potencia 1 · Sentadilla · Banca","bloques":[
{"nombre":"Rodilla","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Sóleo + rodilla isométrico","reps":"30 seg"},{"nombre":"Isométrico de isquios","reps":"30 seg"},{"nombre":"Elevación de sóleo isométrica","reps":"30 seg arriba","carga":"50 kg"},{"nombre":"Nórdicos con banda","reps":"10"}]},
{"nombre":"Calentamiento","tipo":"movilidad","vueltas":1,"ejercicios":[{"nombre":"Extensión torácica arrodillado con PVC","reps":"10"},{"nombre":"Shin box a extensión de cadera","reps":"8 por lado"},{"nombre":"Estiramiento de dorsiflexión semiarrodillado","reps":"12 por lado"},{"nombre":"Bisagra de cadera con deslizamiento a 1 pierna","reps":"10 por lado"},{"nombre":"Sentadilla profunda con rotación torácica","reps":"6"},{"nombre":"Hip airplane asistido","reps":"5"},{"nombre":"DNS side sit to bear","reps":"5 por lado"},{"nombre":"Waterball lift semiarrodillado","reps":"8","carga":"5 kg"}]},
{"nombre":"Activación","tipo":"fuerza","vueltas":2,"ejercicios":[{"nombre":"YTWLI en el piso","reps":"10","carga":"2 kg"},{"nombre":"Flexiones escapulares","reps":"20 seg"},{"nombre":"Overhead carry a 1 brazo con KB invertida","reps":"20 pasos por brazo","carga":"8 kg"},{"nombre":"Sentadilla isométrica con talones elevados","reps":"30 seg","carga":"20-30 kg","nota":"Siempre talones elevados"}]},
{"nombre":"Potencia 1","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Hang power clean","reps":"3","carga":"40-50 kg"},{"nombre":"Pallof press","reps":"15 por lado"},{"nombre":"Rotación interna de cadera","reps":"8"}]},
{"nombre":"Bloque 1","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Sentadilla trasera","reps":"4","carga":"80 kg","nota":"Cluster 2+2"},{"nombre":"CARS de hombro","reps":"10"},{"nombre":"Rotación externa de hombro de costado a 45°","reps":"15","carga":"3 kg"}]},
{"nombre":"Bloque 2","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Press banca","reps":"3","carga":"65 kg"},{"nombre":"Saltos sentado desde banco con mancuernas","reps":"4","carga":"2 × 7,5 kg"}]}]},
{"id":"d2","nombre":"Día 2","foco":"Potencia 2 · Step up · Pendlay · Saltos a 1 pierna","bloques":[
{"nombre":"Rodilla","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Sóleo + rodilla isométrico","reps":"30 seg"},{"nombre":"Isométrico de isquios","reps":"30 seg"},{"nombre":"Elevación de sóleo isométrica","reps":"30 seg arriba","carga":"50 kg"},{"nombre":"Nórdicos con banda","reps":"10"}]},
{"nombre":"Calentamiento","tipo":"movilidad","vueltas":1,"ejercicios":[{"nombre":"Open book de costado","reps":"8"},{"nombre":"Estiramiento de cadera boca arriba","reps":"15 por lado"},{"nombre":"Aductor en cuadrupedia con rotación torácica","reps":"5 por lado"},{"nombre":"Shin box con roll y get up","reps":"10"},{"nombre":"Estocada con rotación","reps":"5 por lado"},{"nombre":"CARS de cadera","reps":"15"},{"nombre":"Knee hug a estocada con codo al empeine","reps":"3 × 10 m"},{"nombre":"Bird dog con alcance","reps":"20 por lado"}]},
{"nombre":"Activación","tipo":"fuerza","vueltas":2,"ejercicios":[{"nombre":"Wall march de serrato con miniband","reps":"10"},{"nombre":"Dominada escapular","reps":"12"},{"nombre":"Press de serrato con mancuerna boca arriba","reps":"15","carga":"15 kg"},{"nombre":"Rueda abdominal","reps":"12"}]},
{"nombre":"Potencia 2","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Power clean a 1 pierna","reps":"3","carga":"20-25 kg"},{"nombre":"Stir the pot en pelota","reps":"10"},{"nombre":"Rotación torácica semiarrodillado (core)","reps":"8","nota":"Sin banda"}]},
{"nombre":"Bloque Fuerza","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Step up lateral con barra","reps":"4","carga":"40 kg"},{"nombre":"Remo Pendlay","reps":"4","carga":"70 kg","nota":"Cuidá la espalda"}]},
{"nombre":"Bloque 2","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Salto al cajón a 1 pierna","reps":"3 por lado"},{"nombre":"Press landmine a 1 brazo semiarrodillado","reps":"6 por lado","carga":"40 kg"}]}]},
{"id":"d3","nombre":"Día 3","foco":"Potencia 3 · Peso muerto rumano · Jerk y saltos","bloques":[
{"nombre":"Rodilla","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Sóleo + rodilla isométrico","reps":"30 seg"},{"nombre":"Isométrico de isquios","reps":"30 seg"},{"nombre":"Elevación de sóleo isométrica","reps":"30 seg arriba","carga":"50 kg"},{"nombre":"Nórdicos con banda","reps":"10"}]},
{"nombre":"Calentamiento","tipo":"movilidad","vueltas":1,"ejercicios":[{"nombre":"Estiramiento lateral lumbar","reps":"8 por lado"},{"nombre":"CARS de cadera","reps":"10"},{"nombre":"Rotación torácica semiarrodillado con KB","reps":"8 por lado"},{"nombre":"Rotaciones de cadera de pie","reps":"10 por lado"},{"nombre":"Spiderman","reps":"5 por lado"},{"nombre":"Miniband en 3 direcciones","reps":"15 por lado"},{"nombre":"Peso muerto rumano a 1 pierna con barra","reps":"10 por lado"},{"nombre":"Deadbug","reps":"20"}]},
{"nombre":"Activación","tipo":"fuerza","vueltas":2,"ejercicios":[{"nombre":"Band pull apart unilateral","reps":"10"},{"nombre":"Ws en el piso","reps":"2 × 20 seg"},{"nombre":"Wall slide de serrato","reps":"8"},{"nombre":"Sentadilla goblet","reps":"12","carga":"20 kg"}]},
{"nombre":"Potencia 3","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Clean high pull con trap bar","reps":"3","carga":"50 kg"},{"nombre":"Pullover a crunch con disco","reps":"15"},{"nombre":"Shin box rotación interna/externa","reps":"8 por lado"}]},
{"nombre":"Bloque 1","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Peso muerto rumano","reps":"5","carga":"70 kg"},{"nombre":"Decoaptación de hombro con KB","reps":"4","nota":"KB pesada"},{"nombre":"Floor scorpion","reps":"5 por lado"}]},
{"nombre":"Bloque 2","tipo":"fuerza","vueltas":3,"ejercicios":[{"nombre":"Landmine split jerk","reps":"3","carga":"30 kg"},{"nombre":"Salto SJ cargado con barra","reps":"3","carga":"30 kg"},{"nombre":"Retracción escapular","reps":"10"}]}]}
]}
```

## 10. Diseño

- Fondo negro neutro (`#0a0a0b`), tarjetas apenas más claras sin bordes y con esquinas redondeadas, y **un solo color de acento: verde lima eléctrico (`#c8ff2e`)**, onda Nike Training / Whoop. Historia: el azul con amarillo "se veía muy IA" y el naranja "no da vibra de app de gym" (20/11). Nada de degradés. Verde, amarillo y rojo solo para la rodilla. Los colores están como variables en `src/styles.css`.
- Títulos de pantalla en Barlow Condensed 800 cursiva y mayúsculas (deportivo). Fotos de los ejercicios en todos lados (Hoy, Entrenar, Ejercicios, Rutina).
- Títulos grandes en minúscula normal (no todo en mayúsculas). Barra de abajo translúcida. Lo que todavía no funciona se ve apagado y dice "Pronto", no parece tocable.
- Títulos con una letra condensada y deportiva (por ejemplo Barlow Condensed) y el resto con una letra fácil de leer (Barlow).
- Números grandes en las series. Íconos simples en SVG, sin emojis.

## 10 bis. Agregados del 20/11 (Santi dijo "mete todo")

Salieron de investigar Hevy, Strong, TrainHeroic, apps de tendinopatía y de salto:
- **Chequeo de la mañana** en Hoy (tabla `diario`, clave fecha): rodilla al levantarse 0-10, el test diario del PF (desde el 20/11: 5 sentadillas a 1 pierna sin silla, un cuarto de sentadilla; dolor 0-10 de la izquierda en `test` y de la derecha en `testDer`, y si la izquierda baja menos en `izqMenos`; el resumen lo muestra día por día), sueño, energía y dolor muscular 1-5. Regla de las 24 h: si la rodilla amanece ≥ 6, o 2 puntos peor que el promedio de las últimas mañanas, aparece un aviso para hablar con el PF.
- **Anotar vóley** (tabla `voley`): entrenamiento, partido o de plaza; minutos, RPE, rodilla al terminar. Cuenta en Hoy, Progreso y el resumen.
- **Entrenar:** el descanso del PF arranca solo al tildar una serie; la pantalla NO se mueve sola al tildar (20/11: a Santi le molestaba que lo llevara a la serie de otro ejercicio); aviso de récord; calculadora de discos (barra 20/15/10); entrada en calor sugerida para cargas de 40 kg o más.
- **Ejercicios:** filtro por Día 1/2/3 con los bloques en orden. Desde el 20/11 la lista trae también 69 ejercicios de gym general que no están en la rutina (brazos, pecho, hombros, espalda, máquinas de piernas, abdominales, cardio), con fotos de free-exercise-db; zona nueva "Brazos" y "Empuje" se muestra como "Pecho". Para sumar más: agregarlos al final de `catalogo.json`, su id en `fotos.json` y las fotos en `public/ejercicios/<id>-0.jpg` y `-1.jpg` achicadas a 480 px de ancho (la prueba chequea que existan). Antes de poner una foto, mirarla: tiene que ser el mismo ejercicio (mismo elemento, postura y dirección). Si la base no tiene una que coincida, mejor sin foto (queda el botón de video). Revisadas una por una el 20/11.
- **Etapa 4 hecha también:** Progreso (gráfico por ejercicio y de tests de salto, récords con 1RM estimado, rodilla gym/mañana/vóley, sesiones por semana, historial con detalle y borrar), fotos propias en la ficha, resumen para el PF (incluye vóley, rodilla a la mañana y cómo llegó), editar la rutina, volver a rutinas anteriores y backup (archivo o copiar; las fotos no entran).
- **Medir salto con video (24/11, como My Jump):** en Entrenar, los ejercicios que se anotan en cm y son saltos verticales (no "horizontal" ni "alcance") tienen "Medir con video". Se elige un video en cámara lenta, se marca despegue y aterrizaje cuadro por cuadro y calcula h = g·t²/8 (`src/lib/salto.ts`). La duración del cuadro se lee del MP4/MOV (`src/lib/mp4.ts`, tabla stts); si no se puede, se mide reproduciendo lento (requestVideoFrameCallback) y si no, 1/30. Los cuadros por segundo de la grabación (240/120/60/30) se eligen arriba; si el archivo ya es de 120 o 240, se eligen solos. El resultado va a la primera serie sin anotar.
- **Base de datos v2:** solo agrega las tablas `diario` y `voley` (hay un test que verifica que pasar de v1 a v2 no pierde nada).

- **Días de gym (20/11):** Santi va lunes, miércoles y viernes (se cambia en Más > Días de gym). Hoy dice "Hoy te toca" / "Hoy descansás · Te toca el lunes". Un día de gym que pasó sin entreno (desde el primer entreno) queda con ✕ en la semana y sale en el resumen para el PF. Tocando un día pasado sin entreno se carga ese entreno con esa fecha; al terminar se puede cambiar el día y los minutos.

## 11. Etapas

Hacé una etapa por vez. Al terminar cada una: corré los tests, publicá, y explicale a Santi en pocos pasos cómo probarla en el iPhone. No arranques la siguiente hasta que él te diga que funciona.

1. **Base y publicación.** Proyecto armado, PWA, las 5 pestañas vacías y publicada en GitHub Pages. Está lista cuando Santi abre el link en el iPhone y la agrega a la pantalla de inicio.
2. **Rutina y ejercicios.** Rutina base cargada, pestaña Ejercicios con las fichas y videos, cargar rutina del PF con revisión de errores.
3. **Entrenar.** La pantalla completa: series, última vez, RPE, descanso, rodilla, guardar, y la sesión que no se pierde si se cierra la app. Pantalla Hoy.
4. **Progreso, fotos y resumen.** Gráficos, historial, fotos en las fichas, resumen para el PF, editar la rutina, backup.

## 12. Cómo trabajar con Santi

- Antes de cada etapa, mostrale un plan corto y esperá su OK.
- Nunca borres ni cambies datos guardados sin una migración de versión de Dexie.
- Si algo de este archivo no se puede hacer o conviene hacerlo distinto, decilo antes.
- Si Santi pide un cambio que cambia una regla, actualizá este archivo también.
- Cuando él tenga que hacer algo en GitHub, decile exactamente dónde tocar.
