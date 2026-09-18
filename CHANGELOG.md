# Registro de cambios

Todos los cambios relevantes de **Liquidador Reforma Laboral 2466** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el
versionado sigue [Versionado Semántico](https://semver.org/lang/es/).

## [No publicado]

### Por hacer

- Ampliación de la cobertura de pruebas del dominio por encima del 90 %.

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
