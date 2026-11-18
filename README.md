# Treadmill Urbis

App Android para registrar por voz las sesiones en la cinta de andar y ver estadísticas.

## Instalar / actualizar

Desde el móvil abre:

**https://github.com/BorjaUrbis/treadmill-urbis/releases/latest/download/TreadmillUrbis.apk**

Instálalo (la primera vez Android pedirá permitir instalar apps de esta fuente). Las versiones nuevas se instalan encima sin perder datos.

## Qué hace

- Registro por **voz, texto o foto** de la pantalla de la cinta → Claude Haiku lo convierte en sesiones (tiempo, velocidad, distancia, carga, descalzo, hora fin). Sin clave de API, voz y texto usan un intérprete básico.
- **Base de datos en Google Sheets** (gratis): sincronización en los dos sentidos; lo que edites en la hoja aparece en la app. Copia local para funcionar sin conexión.
- Pestaña **Datos**: tabla editable celda a celda.
- Dashboard: objetivo semanal editable (toca el anillo), ritmo de la semana vs objetivo, periodos semana/mes/3 meses/año con comparación, barras interactivas, mapa de calor de constancia, velocidad media por semana, reparto descalzo/carga y récords.
- Kcal estimadas con la ecuación de marcha del ACSM sobre peso corporal + carga.
- Notificaciones locales: aviso a la hora elegida si un día entre semana no hay sesión, y resumen el domingo.
- Exportación a Excel (Registro, Resumen semanal, Ajustes).
- Datos guardados en el propio móvil.

## Google Sheets

El script está en `google-apps-script/Code.gs` (también se copia desde la app: Ajustes → Google Sheets). Pasos:
1. Hoja nueva → Extensiones → Apps Script → pega el código → guarda.
2. Ejecuta `setup` una vez y acepta permisos.
3. Implementar → Nueva implementación → Aplicación web · Ejecutar como: Yo · Acceso: Cualquier usuario.
4. Pega la URL `/exec` en la app.

La primera conexión vincula la hoja a la app con un token; si reinstalas la app, ejecuta `resetToken` en el script.

## Desarrollo

- Expo SDK 58 + Expo Router. Código en `src/`.
- `npx tsc --noEmit` para comprobar tipos.
- `npm run gen:gs` regenera `google-apps-script/Code.gs` desde `src/lib/appsScript.ts`.
- Cada push a `main` compila el APK en GitHub Actions y lo publica como release.
