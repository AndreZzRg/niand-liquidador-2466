# Registro de cambios

Todos los cambios relevantes de **Liquidador Reforma Laboral 2466** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el
versionado sigue [Versionado Semántico](https://semver.org/lang/es/).

## [No publicado]

### Corregido

- **Node 20 no podía ejecutar la suite de pruebas.** La matriz de CI incluía
  Node 20, pero `jsdom 30` depende de `undici` y este de
  `worker_threads.markAsUncloneable`, disponible solo desde Node 22.10. En
  Node 20 ningún archivo de pruebas llegaba a arrancar y el paso «Pruebas con
  cobertura» fallaba. Se retira Node 20 de la matriz y se sube el mínimo
  declarado en `engines` a `>=22.10.0`, que es la versión que el entorno de
  pruebas exige de verdad; `.nvmrc` ya fijaba la 22.
- **El paso «Pruebas con cobertura» de la integración continua fallaba.**
  `src/lib/almacen.ts` y `src/lib/exportar.ts` no tenían pruebas y quedaban en
  0 %, lo que arrastraba la cobertura global por debajo de los umbrales
  declarados en `vite.config.ts` y hacía fallar `npm run test:coverage` en cada
  ejecución, aunque `vitest run` a secas pasara.

### Agregado

- Cobertura de pruebas de `src/lib`: validación por esquema y versión del
  almacenamiento, descarte del contenido corrupto, aislamiento de claves entre
  aplicaciones, y escape CSV conforme al RFC 4180 en la exportación.

---

## [1.0.0] — 2026-09-17

Primera versión pública del laboratorio.

### Agregado

- Módulo **Devengado y recargos**.
- Módulo **Liquidación definitiva**.
- Módulo **Seguridad social y parafiscales**.
- Módulo **Indemnización**.
- Módulo **Comparador 2025 / 2026 / 2027**.
- Documentación completa en `docs/`: arquitectura, marco normativo, despliegue,
  guía de uso, decisiones de arquitectura y descargo de responsabilidad.
- Integración continua en tres versiones de Node (20, 22 y 24) con formato, análisis
  estático, verificación de tipos, pruebas con cobertura y construcción de producción.
- Despliegue automático en GitHub Pages desde `main`.
- Análisis de seguridad con CodeQL y actualización de dependencias con Dependabot.
- Sistema de diseño NiAnd Labs con modo claro y oscuro y contraste AA.

### Normativo

- Reglas derivadas de **Ley 2466 de 2025**: Reforma laboral. Jornada nocturna desde las 7:00 p. m. y progresión del recargo dominical y festivo.
- Reglas derivadas de **Código Sustantivo del Trabajo**: Arts. 127, 128, 132, 160, 168, 179, 186, 249, 306 y 64.
- Reglas derivadas de **Ley 50 de 1990**: Régimen de cesantías e intereses a las cesantías.
- Reglas derivadas de **Ley 1393 de 2010**: Art. 30: límite del 40 % a los pagos no constitutivos de salario para efectos del IBC.

> Verificación normativa: 17 de septiembre de 2026.

[No publicado]: https://github.com/AndreZzRg/niand-liquidador-2466/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AndreZzRg/niand-liquidador-2466/releases/tag/v1.0.0
