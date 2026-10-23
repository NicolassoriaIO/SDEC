# SDEC

**Seguimiento de Ejercicio y Comida (SDEC)** es una aplicación móvil para registrar y organizar alimentación, entrenamiento y hábitos de bienestar desde un solo lugar.

La aplicación está pensada para funcionar sin conexión. Las cuentas y los registros se almacenan localmente en SQLite en el dispositivo; no hay sincronización con la nube.

## Funciones

### Alimentación

- Registro diario de comidas y cantidades consumidas.
- Catálogo de alimentos con datos nutricionales y porciones.
- Alimentos personalizados y favoritos.
- Recetas con ingredientes, porciones, instrucciones y cálculo nutricional estimado.
- Registro de agua y seguimiento de objetivos diarios.
- Gestión de suplementos, compras y consumo.

### Entrenamiento y progreso

- Creación y consulta de rutinas.
- Registro de sesiones, ejercicios, series y repeticiones.
- Seguimiento de peso, medidas corporales y pasos.
- Panel de progreso y estadísticas a partir de los registros guardados.

### Planificación y herramientas

- Objetivos y preferencias configurables, como nivel de actividad, meta y días de entrenamiento.
- Presupuesto, gastos, precios de alimentos y lista de compras.
- Recordatorios locales para comidas, entrenamiento, agua y otros hábitos.
- Exportación de los datos de la cuenta a un archivo JSON para guardarlos o compartirlos.
- Temas claro y oscuro, según las preferencias disponibles en la aplicación.

## Almacenamiento y privacidad

- La base de datos SQLite se crea y se gestiona en el dispositivo.
- La app no necesita una cuenta en la nube ni conexión a Internet para consultar y registrar los datos locales.
- Los datos no se sincronizan entre dispositivos. Si se desinstala la aplicación, se pierden los datos locales; exporta una copia de seguridad antes de cambiar de dispositivo o desinstalarla.
- Las contraseñas de las cuentas locales se guardan como hashes, no como texto plano. Al registrarte, guarda también el código de recuperación que muestra la app.
- La exportación JSON puede contener información personal. Guárdala en un lugar seguro y compártela solo con personas de confianza.

## Tecnología

- [React Native](https://reactnative.dev/) y [Expo](https://expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- JavaScript

## Requisitos

- Node.js **22.13.0 o posterior**
- npm
- Para probar en un dispositivo físico: Expo Go o un development build, según las funciones nativas disponibles en tu entorno

## Instalación y ejecución

Clona el repositorio y entra en su carpeta:

```bash
git clone <URL_DEL_REPOSITORIO>
cd AppSDEC
```

Instala las dependencias:

```bash
npm install
```

Inicia el servidor de desarrollo:

```bash
npm start
```

También puedes iniciar el proyecto directamente para una plataforma:

```bash
npm run android
npm run ios
npm run web
```

Sigue las instrucciones de Expo en la terminal para abrir la app en un emulador o dispositivo.

Cuando esté disponible, el APK para Android se publicará en la sección **Releases** de GitHub.

## Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia Expo. |
| `npm run android` | Inicia Expo solicitando Android. |
| `npm run ios` | Inicia Expo solicitando iOS. |
| `npm run web` | Inicia Expo para web. |
| `npm run lint` | Ejecuta Expo Lint. |
| `npm test` | Ejecuta las pruebas configuradas con Jest. |
| `npm run doctor` | Ejecuta Expo Doctor para revisar la configuración del proyecto. |

## Estructura del proyecto

```text
app/                         Pantallas y rutas de Expo Router
src/
  components/                Componentes reutilizables
  constants/                 Constantes y opciones de la aplicación
  database/                  SQLite, migraciones, datos iniciales y repositorios
  features/                  Lógica de autenticación, perfil y nutrición
  services/                  Autenticación, exportación y recordatorios
  theme/                     Tema y estilos compartidos
  utils/                     Cálculos, fechas y validaciones
```

## Datos nutricionales y alcance

El catálogo inicial usa valores de referencia atribuidos a USDA FoodData Central y otras referencias indicadas en la aplicación. Los valores de alimentos, porciones, calorías, macros, costes y objetivos son estimaciones; pueden variar según el producto, la preparación y la región.

SDEC es una herramienta de seguimiento y organización. **No sustituye el consejo de un profesional de la salud, nutrición o entrenamiento.** Consulta con un profesional antes de hacer cambios importantes en tu alimentación o actividad física, especialmente si tienes una condición médica.

## Estado del proyecto

SDEC está en desarrollo. Algunas funciones pueden cambiar y la compatibilidad puede depender de la plataforma y los permisos concedidos al dispositivo.
