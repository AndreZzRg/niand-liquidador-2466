/**
 * Cada prueba nombra el supuesto normativo que verifica, no el detalle de
 * implementación. Si una norma cambia, la prueba que hay que tocar se
 * encuentra por el nombre.
 */
import { describe, expect, it } from 'vitest';

import {
  PARAMETROS,
  finJornadaDiurna,
  horasMensuales,
  jornadaSemanal,
  parametrosDe,
  recargoDominical,
  tarifaARL,
  tarifaFSP,
} from './parametros';
import {
  CONCEPTOS,
  calcularDevengado,
  conceptoPorId,
  horasReclasificadasPor2466,
  repartirJornada,
  tieneAuxilioTransporte,
  valorHoraOrdinaria,
} from './recargos';
import {
  cesantias,
  diasServicio360,
  indemnizacion,
  interesesCesantias,
  liquidar,
  primaServicios,
  vacaciones,
} from './prestaciones';
import { calcularAportes, calcularIBC, provisionesMensuales } from './aportes';

const SMMLV_2025 = 1_423_500;
const AUXILIO_2025 = 200_000;

/** Comparación en pesos: las diferencias por debajo de un peso no importan. */
const enPesos = (v: number) => Math.round(v);

/* ════════════════════════════════════════════════════════════════
   Parámetros
   ════════════════════════════════════════════════════════════════ */

describe('parámetros anuales', () => {
  it('trae los valores verificados de 2025 (Decreto 1572 de 2024)', () => {
    const p = parametrosDe(2025);
    expect(p.smmlv).toBe(SMMLV_2025);
    expect(p.auxilioTransporte).toBe(AUXILIO_2025);
    expect(p.verificado).toBe(true);
  });

  it('marca 2026 como pendiente de confirmar en lugar de inventar la cifra', () => {
    const p = parametrosDe(2026);
    expect(p.verificado).toBe(false);
    expect(p.fuente).toMatch(/PENDIENTE/);
  });

  it('marca como no verificado cualquier año fuera de la tabla', () => {
    expect(parametrosDe(2031).verificado).toBe(false);
    expect(parametrosDe(2015).verificado).toBe(false);
  });

  it('no deja ningún año con valores en cero', () => {
    for (const p of PARAMETROS) {
      expect(p.smmlv, String(p.anio)).toBeGreaterThan(0);
      expect(p.auxilioTransporte, String(p.anio)).toBeGreaterThan(0);
    }
  });
});

describe('jornada máxima semanal (Ley 2101 de 2021)', () => {
  it('sigue la reducción gradual sin afectar el salario', () => {
    expect(jornadaSemanal('2023-01-01')).toBe(48);
    expect(jornadaSemanal('2023-07-15')).toBe(47);
    expect(jornadaSemanal('2024-07-15')).toBe(46);
    expect(jornadaSemanal('2025-07-15')).toBe(44);
    expect(jornadaSemanal('2026-07-15')).toBe(42);
  });

  it('conserva el divisor legal de 240 horas mensuales', () => {
    expect(horasMensuales('legal', '2026-09-17')).toBe(240);
  });

  it('proyecta la jornada real al mes cuando así se pacta', () => {
    // 42 horas semanales × 30 ÷ 7 = 180 horas al mes.
    expect(horasMensuales('jornadaReal', '2026-09-17')).toBeCloseTo(180, 6);
  });
});

/* ════════════════════════════════════════════════════════════════
   Ley 2466 de 2025 — jornada nocturna y recargo dominical
   ════════════════════════════════════════════════════════════════ */

describe('jornada diurna (CST art. 160, modificado por la Ley 2466 de 2025)', () => {
  it('termina a las 9:00 p. m. antes del 26 de diciembre de 2025', () => {
    expect(finJornadaDiurna('2025-12-25')).toBe(21);
  });

  it('termina a las 7:00 p. m. desde el 26 de diciembre de 2025', () => {
    expect(finJornadaDiurna('2025-12-26')).toBe(19);
    expect(finJornadaDiurna('2026-09-17')).toBe(19);
  });
});

describe('reparto de un turno entre jornada diurna y nocturna', () => {
  it('parte el turno de 6:00 p. m. a 10:00 p. m. en la frontera vigente', () => {
    const turno = { inicio: 18, duracion: 4 };
    expect(repartirJornada(turno, '2025-01-01')).toEqual({ diurnas: 3, nocturnas: 1 });
    expect(repartirJornada(turno, '2026-01-01')).toEqual({ diurnas: 1, nocturnas: 3 });
  });

  it('trata como nocturno el turno que cruza la medianoche', () => {
    expect(repartirJornada({ inicio: 22, duracion: 8 }, '2026-01-01')).toEqual({
      diurnas: 0,
      nocturnas: 8,
    });
  });

  it('trata como diurno el turno de oficina', () => {
    expect(repartirJornada({ inicio: 8, duracion: 8 }, '2026-01-01')).toEqual({
      diurnas: 8,
      nocturnas: 0,
    });
  });

  it('reparte el turno de 4:00 a. m. a 12:00 m. entre ambas franjas', () => {
    expect(repartirJornada({ inicio: 4, duracion: 8 }, '2026-01-01')).toEqual({
      diurnas: 6,
      nocturnas: 2,
    });
  });

  it('devuelve cero en un turno sin duración', () => {
    expect(repartirJornada({ inicio: 10, duracion: 0 }, '2026-01-01')).toEqual({
      diurnas: 0,
      nocturnas: 0,
    });
  });

  it('cuantifica las horas que la reforma reclasificó a nocturnas', () => {
    // El tramo de 7:00 p. m. a 9:00 p. m. pasa de diurno a nocturno.
    expect(horasReclasificadasPor2466({ inicio: 18, duracion: 4 })).toBe(2);
    expect(horasReclasificadasPor2466({ inicio: 8, duracion: 8 })).toBe(0);
    expect(horasReclasificadasPor2466({ inicio: 13, duracion: 8 })).toBe(2);
  });
});

describe('recargo dominical y festivo (CST art. 179, Ley 2466 de 2025)', () => {
  it('sigue la progresión legal año a año', () => {
    expect(recargoDominical('2025-06-30')).toBe(0.75);
    expect(recargoDominical('2025-07-01')).toBe(0.8);
    expect(recargoDominical('2026-06-30')).toBe(0.8);
    expect(recargoDominical('2026-07-01')).toBe(0.9);
    expect(recargoDominical('2027-06-30')).toBe(0.9);
    expect(recargoDominical('2027-07-01')).toBe(1.0);
    expect(recargoDominical('2030-01-01')).toBe(1.0);
  });
});

describe('factores de los conceptos de recargo', () => {
  it('aplica los porcentajes del art. 168 del CST', () => {
    const f = '2026-09-17';
    expect(conceptoPorId('recargoNocturno').factor(f)).toBeCloseTo(0.35, 10);
    expect(conceptoPorId('extraDiurna').factor(f)).toBeCloseTo(1.25, 10);
    expect(conceptoPorId('extraNocturna').factor(f)).toBeCloseTo(1.75, 10);
  });

  it('acumula el recargo dominical con el nocturno y con las extras', () => {
    const f = '2026-09-17'; // dominical al 90 %
    expect(conceptoPorId('dominicalDiurna').factor(f)).toBeCloseTo(0.9, 10);
    expect(conceptoPorId('dominicalNocturna').factor(f)).toBeCloseTo(1.25, 10);
    expect(conceptoPorId('extraDiurnaDominical').factor(f)).toBeCloseTo(2.15, 10);
    expect(conceptoPorId('extraNocturnaDominical').factor(f)).toBeCloseTo(2.65, 10);
  });

  it('declara la norma de cada concepto', () => {
    for (const c of CONCEPTOS) {
      expect(c.norma, c.id).toMatch(/CST|Ley/);
    }
  });

  it('rechaza un concepto inexistente', () => {
    // @ts-expect-error se comprueba la defensa en tiempo de ejecución
    expect(() => conceptoPorId('inventado')).toThrow(RangeError);
  });
});

/* ════════════════════════════════════════════════════════════════
   Devengado
   ════════════════════════════════════════════════════════════════ */

describe('valor de la hora ordinaria', () => {
  it('divide el salario mensual entre 240 en la base legal', () => {
    expect(valorHoraOrdinaria(SMMLV_2025, 'legal', '2025-06-01')).toBeCloseTo(5931.25, 6);
  });
});

describe('auxilio de transporte (Ley 15 de 1959)', () => {
  it('se debe hasta dos salarios mínimos', () => {
    expect(tieneAuxilioTransporte(SMMLV_2025, 2025)).toBe(true);
    expect(tieneAuxilioTransporte(SMMLV_2025 * 2, 2025)).toBe(true);
    expect(tieneAuxilioTransporte(SMMLV_2025 * 2 + 1, 2025)).toBe(false);
  });
});

describe('devengado del periodo', () => {
  const base = {
    salarioMensual: SMMLV_2025,
    diasLaborados: 30,
    otrosSalariales: 0,
    noSalariales: 0,
    fecha: '2025-06-15',
    baseHoraria: 'legal' as const,
  };

  it('paga el sueldo completo y el auxilio en un mes sin recargos', () => {
    const d = calcularDevengado({ ...base, horas: {} });
    expect(enPesos(d.sueldoProporcional)).toBe(SMMLV_2025);
    expect(enPesos(d.auxilioTransporte)).toBe(AUXILIO_2025);
    expect(d.lineas).toHaveLength(0);
    expect(enPesos(d.totalDevengado)).toBe(SMMLV_2025 + AUXILIO_2025);
  });

  it('prorratea sueldo y auxilio en un mes incompleto', () => {
    const d = calcularDevengado({ ...base, diasLaborados: 15, horas: {} });
    expect(enPesos(d.sueldoProporcional)).toBe(enPesos(SMMLV_2025 / 2));
    expect(enPesos(d.auxilioTransporte)).toBe(AUXILIO_2025 / 2);
  });

  it('liquida el recargo nocturno al 35 % de la hora ordinaria', () => {
    const d = calcularDevengado({ ...base, horas: { recargoNocturno: 10 } });
    expect(enPesos(d.totalRecargos)).toBe(enPesos(10 * 5931.25 * 0.35));
  });

  it('liquida la hora extra diurna al 125 %', () => {
    const d = calcularDevengado({ ...base, horas: { extraDiurna: 4 } });
    expect(enPesos(d.totalRecargos)).toBe(enPesos(4 * 5931.25 * 1.25));
  });

  it('aplica el recargo dominical vigente en la fecha de causación', () => {
    const junio = calcularDevengado({
      ...base,
      fecha: '2025-06-30',
      horas: { dominicalDiurna: 8 },
    });
    const julio = calcularDevengado({
      ...base,
      fecha: '2025-07-01',
      horas: { dominicalDiurna: 8 },
    });
    expect(enPesos(junio.totalRecargos)).toBe(enPesos(8 * 5931.25 * 0.75));
    expect(enPesos(julio.totalRecargos)).toBe(enPesos(8 * 5931.25 * 0.8));
    expect(julio.totalRecargos).toBeGreaterThan(junio.totalRecargos);
  });

  it('suma los recargos concurrentes en una sola liquidación', () => {
    const d = calcularDevengado({
      ...base,
      horas: { recargoNocturno: 10, extraDiurna: 4, dominicalDiurna: 8 },
    });
    expect(d.lineas).toHaveLength(3);
    const esperado = 10 * 5931.25 * 0.35 + 4 * 5931.25 * 1.25 + 8 * 5931.25 * 0.75;
    expect(enPesos(d.totalRecargos)).toBe(enPesos(esperado));
  });

  it('no reconoce auxilio de transporte por encima de dos salarios mínimos', () => {
    const d = calcularDevengado({ ...base, salarioMensual: SMMLV_2025 * 3, horas: {} });
    expect(d.auxilioTransporte).toBe(0);
  });

  it('advierte cuando los parámetros del año no están confirmados', () => {
    const d = calcularDevengado({ ...base, fecha: '2026-09-17', horas: {} });
    expect(d.avisos.some((a) => a.includes('no están confirmados'))).toBe(true);
  });

  it('advierte cuando las horas extra exceden el máximo legal', () => {
    const d = calcularDevengado({ ...base, horas: { extraDiurna: 30 } });
    expect(d.avisos.some((a) => a.includes('Ley 50 de 1990'))).toBe(true);
  });

  it('advierte cuando los pagos no salariales superan el 40 %', () => {
    const d = calcularDevengado({
      ...base,
      noSalariales: 5_000_000,
      horas: {},
    });
    expect(d.avisos.some((a) => a.includes('Ley 1393 de 2010'))).toBe(true);
  });

  it('limita el mes a 30 días y lo advierte', () => {
    const d = calcularDevengado({ ...base, diasLaborados: 45, horas: {} });
    expect(enPesos(d.sueldoProporcional)).toBe(SMMLV_2025);
    expect(d.avisos.some((a) => a.includes('30 días'))).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════════
   Prestaciones sociales
   ════════════════════════════════════════════════════════════════ */

describe('prestaciones sociales', () => {
  const base = { salarioBase: SMMLV_2025, auxilioTransporte: AUXILIO_2025 };
  const conAuxilio = SMMLV_2025 + AUXILIO_2025;

  it('liquida un año completo de cesantías sobre salario más auxilio', () => {
    expect(enPesos(cesantias(base, 360).valor)).toBe(conAuxilio);
  });

  it('liquida los intereses a las cesantías al 12 % anual', () => {
    const c = cesantias(base, 360);
    expect(enPesos(interesesCesantias(c.valor, 360).valor)).toBe(enPesos(conAuxilio * 0.12));
  });

  it('liquida el semestre de prima de forma proporcional', () => {
    expect(enPesos(primaServicios(base, 180).valor)).toBe(enPesos(conAuxilio / 2));
  });

  it('excluye el auxilio de transporte de la base de vacaciones (CST art. 192)', () => {
    expect(enPesos(vacaciones(base, 360).valor)).toBe(enPesos(SMMLV_2025 / 2));
  });

  it('declara la norma y la fórmula de cada prestación', () => {
    for (const p of [cesantias(base, 360), primaServicios(base, 360), vacaciones(base, 360)]) {
      expect(p.norma).toMatch(/CST|Ley/);
      expect(p.formula.length).toBeGreaterThan(0);
    }
  });
});

/* ════════════════════════════════════════════════════════════════
   Indemnización — CST art. 64
   ════════════════════════════════════════════════════════════════ */

describe('indemnización por despido sin justa causa (CST art. 64)', () => {
  const comun = { salarioBase: SMMLV_2025, diasFaltantes: 0, anio: 2025 };

  it('paga 30 días por el primer año en el contrato indefinido de menos de 10 SMMLV', () => {
    const i = indemnizacion({ ...comun, tipoContrato: 'indefinido', diasServicio: 360 });
    expect(i.diasIndemnizados).toBeCloseTo(30, 6);
    expect(enPesos(i.valor)).toBe(SMMLV_2025);
  });

  it('agrega 20 días por cada año adicional', () => {
    const i = indemnizacion({ ...comun, tipoContrato: 'indefinido', diasServicio: 720 });
    expect(i.diasIndemnizados).toBeCloseTo(50, 6);
  });

  it('prorratea la fracción de año adicional', () => {
    const i = indemnizacion({ ...comun, tipoContrato: 'indefinido', diasServicio: 540 });
    expect(i.diasIndemnizados).toBeCloseTo(40, 6);
  });

  it('prorratea el primer año cuando el servicio es menor', () => {
    const i = indemnizacion({ ...comun, tipoContrato: 'indefinido', diasServicio: 180 });
    expect(i.diasIndemnizados).toBeCloseTo(15, 6);
  });

  it('aplica la tabla reducida desde 10 SMMLV', () => {
    const alto = { ...comun, salarioBase: SMMLV_2025 * 10 };
    const i = indemnizacion({ ...alto, tipoContrato: 'indefinido', diasServicio: 720 });
    expect(i.diasIndemnizados).toBeCloseTo(35, 6);
    expect(i.regla).toMatch(/10 SMMLV o más/);
  });

  it('mantiene la tabla plena justo por debajo del umbral', () => {
    const casi = { ...comun, salarioBase: SMMLV_2025 * 10 - 1 };
    const i = indemnizacion({ ...casi, tipoContrato: 'indefinido', diasServicio: 720 });
    expect(i.diasIndemnizados).toBeCloseTo(50, 6);
  });

  it('indemniza el tiempo faltante en el contrato a término fijo', () => {
    const i = indemnizacion({
      ...comun,
      tipoContrato: 'fijo',
      diasServicio: 180,
      diasFaltantes: 90,
    });
    expect(i.diasIndemnizados).toBe(90);
    expect(enPesos(i.valor)).toBe(enPesos((SMMLV_2025 / 30) * 90));
  });

  it('aplica el mínimo de 15 días cuando falta menos tiempo', () => {
    const i = indemnizacion({
      ...comun,
      tipoContrato: 'fijo',
      diasServicio: 300,
      diasFaltantes: 10,
    });
    expect(i.diasIndemnizados).toBe(15);
    expect(i.detalle.some((d) => d.includes('mínimo legal'))).toBe(true);
  });

  it('trata el contrato por obra o labor como el término fijo', () => {
    const i = indemnizacion({
      ...comun,
      tipoContrato: 'obraLabor',
      diasServicio: 100,
      diasFaltantes: 45,
    });
    expect(i.diasIndemnizados).toBe(45);
    expect(i.regla).toMatch(/Obra o labor/);
  });
});

/* ════════════════════════════════════════════════════════════════
   Liquidación definitiva
   ════════════════════════════════════════════════════════════════ */

describe('liquidación definitiva de contrato', () => {
  const comun = {
    salarioBase: SMMLV_2025,
    auxilioTransporte: AUXILIO_2025,
    tipoContrato: 'indefinido' as const,
    diasFaltantes: 0,
    vacacionesTomadas: 0,
  };

  it('cuenta el año de servicio como 360 días, incluido el día de retiro', () => {
    // Del 1 de enero al 31 de diciembre hay 360 días de servicio: el último
    // día de vinculación es un día trabajado y se paga.
    expect(diasServicio360('2024-01-01', '2024-12-31')).toBe(360);
    const l = liquidar({
      ...comun,
      ingreso: '2024-01-01',
      retiro: '2024-12-31',
      causa: 'renuncia',
    });
    expect(l.diasServicio).toBe(360);
  });

  it('liquida las cuatro prestaciones cualquiera que sea la causa', () => {
    const l = liquidar({
      ...comun,
      ingreso: '2024-01-01',
      retiro: '2025-07-01',
      causa: 'justaCausa',
    });
    expect(l.prestaciones.map((p) => p.concepto)).toEqual([
      'Cesantías',
      'Intereses a las cesantías',
      'Prima de servicios',
      'Vacaciones',
    ]);
    expect(l.totalPrestaciones).toBeGreaterThan(0);
  });

  it('no liquida indemnización en la renuncia', () => {
    const l = liquidar({
      ...comun,
      ingreso: '2024-01-01',
      retiro: '2025-07-01',
      causa: 'renuncia',
    });
    expect(l.indemnizacion).toBeNull();
    expect(l.total).toBe(l.totalPrestaciones);
    expect(l.avisos.some((a) => a.includes('art. 64'))).toBe(true);
  });

  it('liquida indemnización en el despido sin justa causa', () => {
    const l = liquidar({
      ...comun,
      ingreso: '2023-01-01',
      retiro: '2024-12-31',
      causa: 'sinJustaCausa',
    });
    expect(l.indemnizacion).not.toBeNull();
    expect(l.indemnizacion!.diasIndemnizados).toBeCloseTo(50, 6);
    expect(l.total).toBeGreaterThan(l.totalPrestaciones);
  });

  it('limita la prima al semestre en curso', () => {
    const l = liquidar({
      ...comun,
      ingreso: '2020-01-01',
      retiro: '2025-09-30',
      causa: 'renuncia',
    });
    const prima = l.prestaciones.find((p) => p.concepto === 'Prima de servicios')!;
    // Del 1 de julio al 30 de septiembre: 90 días en base 360.
    expect(prima.dias).toBe(90);
  });

  it('limita las cesantías al año en curso', () => {
    const l = liquidar({
      ...comun,
      ingreso: '2020-01-01',
      retiro: '2025-09-30',
      causa: 'renuncia',
    });
    const ces = l.prestaciones.find((p) => p.concepto === 'Cesantías')!;
    expect(ces.dias).toBe(270);
  });

  it('no cuenta periodos anteriores al ingreso', () => {
    const l = liquidar({
      ...comun,
      ingreso: '2025-08-01',
      retiro: '2025-09-30',
      causa: 'renuncia',
    });
    expect(l.prestaciones.find((p) => p.concepto === 'Cesantías')!.dias).toBe(60);
  });

  it('descuenta las vacaciones ya disfrutadas', () => {
    const sin = liquidar({
      ...comun,
      ingreso: '2023-01-01',
      retiro: '2024-12-31',
      causa: 'renuncia',
    });
    const con = liquidar({
      ...comun,
      ingreso: '2023-01-01',
      retiro: '2024-12-31',
      causa: 'renuncia',
      vacacionesTomadas: 15,
    });
    const vSin = sin.prestaciones.find((p) => p.concepto === 'Vacaciones')!;
    const vCon = con.prestaciones.find((p) => p.concepto === 'Vacaciones')!;
    expect(vCon.valor).toBeLessThan(vSin.valor);
    expect(vCon.dias).toBe(vSin.dias - 360);
  });

  it('recuerda siempre la indemnización moratoria del art. 65', () => {
    const l = liquidar({
      ...comun,
      ingreso: '2024-01-01',
      retiro: '2025-01-01',
      causa: 'renuncia',
    });
    expect(l.avisos.some((a) => a.includes('art. 65'))).toBe(true);
  });

  it('rechaza un retiro anterior al ingreso', () => {
    expect(() =>
      liquidar({ ...comun, ingreso: '2025-06-01', retiro: '2025-01-01', causa: 'renuncia' }),
    ).toThrow(RangeError);
  });
});

/* ════════════════════════════════════════════════════════════════
   Seguridad social y parafiscales
   ════════════════════════════════════════════════════════════════ */

describe('ingreso base de cotización', () => {
  const comun = {
    anio: 2025,
    claseARL: 'I' as const,
    empleadorExonerable: true,
    salarioIntegral: false,
  };

  it('toma los pagos salariales cuando no hay pactos no salariales', () => {
    const { ibc } = calcularIBC({ ...comun, salarial: 5_000_000, noSalarial: 0 });
    expect(ibc).toBe(5_000_000);
  });

  it('incorpora el exceso del 40 % no salarial (Ley 1393 de 2010)', () => {
    const { ibc, avisos } = calcularIBC({ ...comun, salarial: 5_000_000, noSalarial: 5_000_000 });
    // Total 10 000 000; máximo no salarial 4 000 000; exceso 1 000 000.
    expect(ibc).toBe(6_000_000);
    expect(avisos.some((a) => a.includes('Ley 1393'))).toBe(true);
  });

  it('no ajusta nada si lo no salarial está dentro del 40 %', () => {
    const { ibc } = calcularIBC({ ...comun, salarial: 7_000_000, noSalarial: 3_000_000 });
    expect(ibc).toBe(7_000_000);
  });

  it('cotiza sobre el 70 % en el salario integral (CST art. 132)', () => {
    const { ibc } = calcularIBC({
      ...comun,
      salarial: 20_000_000,
      noSalarial: 0,
      salarioIntegral: true,
    });
    expect(ibc).toBe(14_000_000);
  });

  it('eleva la base al salario mínimo cuando queda por debajo', () => {
    const { ibc, avisos } = calcularIBC({ ...comun, salarial: 500_000, noSalarial: 0 });
    expect(ibc).toBe(SMMLV_2025);
    expect(avisos.some((a) => a.includes('salario mínimo'))).toBe(true);
  });

  it('limita la base a 25 salarios mínimos (Ley 100 de 1993, art. 18)', () => {
    const { ibc, avisos } = calcularIBC({ ...comun, salarial: 60_000_000, noSalarial: 0 });
    expect(ibc).toBe(SMMLV_2025 * 25);
    expect(avisos.some((a) => a.includes('25 salarios'))).toBe(true);
  });
});

describe('aporte al Fondo de Solidaridad Pensional (Ley 797 de 2003)', () => {
  it('no se causa por debajo de 4 salarios mínimos', () => {
    expect(tarifaFSP(3.99)).toBe(0);
  });

  it('es del 1 % entre 4 y 16 salarios mínimos', () => {
    expect(tarifaFSP(4)).toBe(0.01);
    expect(tarifaFSP(15.99)).toBe(0.01);
  });

  it('sube por tramos a partir de 16 salarios mínimos', () => {
    expect(tarifaFSP(16)).toBe(0.012);
    expect(tarifaFSP(17)).toBe(0.014);
    expect(tarifaFSP(18)).toBe(0.016);
    expect(tarifaFSP(19)).toBe(0.018);
    expect(tarifaFSP(20)).toBe(0.02);
    expect(tarifaFSP(25)).toBe(0.02);
  });
});

describe('tarifas de riesgos laborales (Decreto 1772 de 1994)', () => {
  it('asigna la tarifa de cada clase', () => {
    expect(tarifaARL('I')).toBeCloseTo(0.00522, 10);
    expect(tarifaARL('V')).toBeCloseTo(0.0696, 10);
  });
});

describe('liquidación de aportes', () => {
  const comun = {
    anio: 2025,
    claseARL: 'I' as const,
    empleadorExonerable: true,
    salarioIntegral: false,
  };

  it('descuenta al trabajador el 4 % de salud y el 4 % de pensión', () => {
    const a = calcularAportes({ ...comun, salarial: SMMLV_2025, noSalarial: 0 });
    expect(enPesos(a.totalTrabajador)).toBe(enPesos(SMMLV_2025 * 0.08));
  });

  it('exonera al empleador de salud, SENA e ICBF por debajo de 10 SMMLV', () => {
    const a = calcularAportes({ ...comun, salarial: SMMLV_2025, noSalarial: 0 });
    const exonerados = a.lineas.filter((l) => l.exonerado);
    expect(exonerados.map((l) => l.concepto).sort()).toEqual(['ICBF', 'SENA', 'Salud']);
    expect(exonerados.every((l) => l.valor === 0)).toBe(true);
    expect(a.avisos.some((x) => x.includes('114-1'))).toBe(true);
  });

  it('no exonera por encima de 10 SMMLV', () => {
    const a = calcularAportes({ ...comun, salarial: SMMLV_2025 * 11, noSalarial: 0 });
    expect(a.lineas.some((l) => l.exonerado)).toBe(false);
  });

  it('no exonera a un empleador que no es sujeto del art. 114-1', () => {
    const a = calcularAportes({
      ...comun,
      salarial: SMMLV_2025,
      noSalarial: 0,
      empleadorExonerable: false,
    });
    expect(a.lineas.some((l) => l.exonerado)).toBe(false);
    expect(enPesos(a.totalEmpleador)).toBeGreaterThan(0);
  });

  it('cobra el Fondo de Solidaridad Pensional desde 4 SMMLV', () => {
    const bajo = calcularAportes({ ...comun, salarial: SMMLV_2025 * 3, noSalarial: 0 });
    const alto = calcularAportes({ ...comun, salarial: SMMLV_2025 * 5, noSalarial: 0 });
    expect(bajo.lineas.some((l) => l.concepto.includes('Solidaridad'))).toBe(false);
    expect(alto.lineas.some((l) => l.concepto.includes('Solidaridad'))).toBe(true);
  });

  it('calcula el costo del empleador como remuneración más aportes a su cargo', () => {
    const a = calcularAportes({ ...comun, salarial: SMMLV_2025, noSalarial: 100_000 });
    expect(enPesos(a.costoEmpleador)).toBe(enPesos(SMMLV_2025 + 100_000 + a.totalEmpleador));
  });

  it('sube el costo del empleador con la clase de riesgo', () => {
    const i = calcularAportes({ ...comun, salarial: SMMLV_2025, noSalarial: 0 });
    const v = calcularAportes({ ...comun, salarial: SMMLV_2025, noSalarial: 0, claseARL: 'V' });
    expect(v.totalEmpleador).toBeGreaterThan(i.totalEmpleador);
  });
});

describe('provisión mensual de prestaciones', () => {
  it('provisiona las vacaciones sobre el salario y el resto con auxilio', () => {
    const p = provisionesMensuales(SMMLV_2025, SMMLV_2025 + AUXILIO_2025);
    const vac = p.find((x) => x.concepto === 'Vacaciones')!;
    const ces = p.find((x) => x.concepto === 'Cesantías')!;
    expect(vac.base).toBe(SMMLV_2025);
    expect(ces.base).toBe(SMMLV_2025 + AUXILIO_2025);
  });

  it('suma alrededor del 21,8 % del salario', () => {
    const total = provisionesMensuales(1_000_000, 1_000_000).reduce((s, x) => s + x.valor, 0);
    expect(total / 1_000_000).toBeCloseTo(0.2183, 3);
  });
});
