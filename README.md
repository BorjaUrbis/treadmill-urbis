# Treadmill Urbis

App Android para registrar por voz las sesiones en la cinta de andar y ver estadísticas.

## Instalar / actualizar

Desde el móvil abre:

**https://github.com/BorjaUrbis/treadmill-urbis/releases/latest/download/TreadmillUrbis.apk**

Instálalo (la primera vez Android pedirá permitir instalar apps de esta fuente). Las versiones nuevas se instalan encima sin perder datos.

## Qué hace

- Dictado por voz en español → Claude Haiku lo convierte en sesiones (tiempo, velocidad, distancia, carga, descalzo, hora fin). Sin clave de API usa un intérprete básico.
- Dashboard: progreso semanal vs objetivo, km por día, últimas 8 semanas, racha, comparación con la semana pasada, histórico.
- Kcal estimadas con la ecuación de marcha del ACSM sobre peso corporal + carga.
- Notificaciones locales: aviso a la hora elegida si un día entre semana no hay sesión, y resumen el domingo.
- Exportación a Excel (Registro, Resumen semanal, Ajustes).
- Datos guardados en el propio móvil.

## Desarrollo

- Expo SDK 58 + Expo Router. Código en `src/`.
- `npx tsc --noEmit` para comprobar tipos.
- Cada push a `main` compila el APK en GitHub Actions y lo publica como release.
