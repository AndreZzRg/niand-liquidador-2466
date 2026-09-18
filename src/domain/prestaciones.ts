/**
 * Prestaciones sociales e indemnización por terminación sin justa causa.
 *
 * Fundamento:
 * · Cesantías — CST art. 249 y Ley 50 de 1990, art. 98.
 * · Intereses a las cesantías — Ley 52 de 1975, art. 1 (12 % anual).
 * · Prima de servicios — CST art. 306, modificado por la Ley 1788 de 2016.
 * · Vacaciones — CST art. 186 (15 días hábiles por año) y art. 192.
 * · Indemnización — CST art. 64, modificado por la Ley 789 de 2002, art. 28.
 *
 * El año laboral se cuenta de 360 días y el mes de 30, con independencia de
 * los días calendario reales.
 */
import { diasComerciales, type FechaISO } from '../lib/fechas';
import {
  TASA_INTERESES_CESANTIAS,
  UMBRAL_INDEMNIZACION_SMMLV,
  resolverParametros,
  type ParametrosManuales,
} from './parametros';

/* ══ Base de liquidación ═════════════════════════════════════════ */

export interface BaseLiquidacion {
  /**
   * Salario mensual promedio del periodo que se liquida, incluidos los pagos
   * salariales variables (CST, art. 127). No incluye el auxilio de transporte.
   */
  readonly salarioBase: number;
  /** Auxilio de transporte mensual devengado, si hay derecho a él. */
  readonly auxilioTransporte: number;
}

/**
 * Base de cesantías y prima: salario más auxilio de transporte
 * (Ley 1ª de 1963, art. 7).
 */
export function baseConAuxilio(b: BaseLiquidacion): number {
  return b.salarioBase + b.auxilioTransporte;
}

/**
 * Base de vacaciones: solo el salario ordinario. El auxilio de transporte no
 * entra, porque durante las vacaciones no hay desplazamiento al trabajo
 * (CST, art. 192, y doctrina reiterada del Ministerio del Trabajo).
 */
export function baseVacaciones(b: BaseLiquidacion): number {
  return b.salarioBase;
}

/* ══ Prestaciones ════════════════════════════════════════════════ */

export interface Prestacion {
  readonly concepto: string;
  readonly norma: string;
  readonly base: number;
  readonly dias: number;
  readonly formula: string;
  readonly valor: number;
}

/** Cesantías: base × días / 360 (CST, art. 249). */
export function cesantias(b: BaseLiquidacion, dias: number): Prestacion {
  const base = baseConAuxilio(b);
  return {
    concepto: 'Cesantías',
    norma: 'CST art. 249 · Ley 50 de 1990',
    base,
    dias,
    formula: '(salario + auxilio) × días ÷ 360',
    valor: (base * dias) / 360,
  };
}

/**
 * Intereses a las cesantías: 12 % anual sobre el saldo, proporcional al tiempo
 * (Ley 52 de 1975, art. 1). Se calculan sobre las cesantías causadas.
 */
export function interesesCesantias(cesantiasValor: number, dias: number): Prestacion {
  return {
    concepto: 'Intereses a las cesantías',
    norma: 'Ley 52 de 1975, art. 1',
    base: cesantiasValor,
    dias,
    formula: 'cesantías × días × 12 % ÷ 360',
    valor: (cesantiasValor * dias * TASA_INTERESES_CESANTIAS) / 360,
  };
}

/** Prima de servicios: base × días / 360 (CST, art. 306). */
export function primaServicios(b: BaseLiquidacion, dias: number): Prestacion {
  const base = baseConAuxilio(b);
  return {
    concepto: 'Prima de servicios',
    norma: 'CST art. 306 · Ley 1788 de 2016',
    base,
    dias,
    formula: '(salario + auxilio) × días ÷ 360',
    valor: (base * dias) / 360,
  };
}

/**
 * Vacaciones: 15 días hábiles por año de servicio, que en dinero equivalen a
 * salario × días / 720 (CST, arts. 186 y 192).
 */
export function vacaciones(b: BaseLiquidacion, dias: number): Prestacion {
  const base = baseVacaciones(b);
  return {
    concepto: 'Vacaciones',
    norma: 'CST arts. 186 y 192',
    base,
    dias,
    formula: 'salario × días ÷ 720',
    valor: (base * dias) / 720,
  };
}

/* ══ Indemnización por despido sin justa causa ═══════════════════ */

export type TipoContrato = 'indefinido' | 'fijo' | 'obraLabor';

export interface EntradaIndemnizacion {
  readonly tipoContrato: TipoContrato;
  readonly salarioBase: number;
  /** Días de servicio, contados en base 360. */
  readonly diasServicio: number;
  /** Días que faltaban para terminar el contrato a término fijo o la obra. */
  readonly diasFaltantes: number;
  readonly anio: number;
  readonly parametros?: ParametrosManuales;
}

export interface Indemnizacion {
  readonly aplica: boolean;
  readonly regla: string;
  readonly norma: string;
  readonly diasIndemnizados: number;
  readonly valorDia: number;
  readonly valor: number;
  readonly detalle: readonly string[];
}

/**
 * Indemnización del art. 64 del CST.
 *
 * Contrato a término fijo o por obra: el valor de los salarios del tiempo que
 * faltaba para cumplir el plazo, con un mínimo de 15 días.
 *
 * Contrato a término indefinido:
 * · Salario inferior a 10 SMMLV — 30 días por el primer año y 20 días por cada
 *   año siguiente, proporcional por fracción.
 * · Salario de 10 SMMLV o más — 20 días por el primer año y 15 días por cada
 *   año siguiente, proporcional por fracción.
 */
export function indemnizacion(e: EntradaIndemnizacion): Indemnizacion {
  const valorDia = e.salarioBase / 30;
  const { smmlv } = resolverParametros(e.anio, e.parametros);

  if (e.tipoContrato !== 'indefinido') {
    const dias = Math.max(e.diasFaltantes, 15);
    const minimoAplicado = e.diasFaltantes < 15;
    return {
      aplica: true,
      regla:
        e.tipoContrato === 'fijo'
          ? 'Término fijo: salarios del tiempo faltante, con un mínimo de 15 días'
          : 'Obra o labor: salarios del tiempo faltante para terminar la obra, con un mínimo de 15 días',
      norma: 'CST art. 64, modificado por la Ley 789 de 2002, art. 28',
      diasIndemnizados: dias,
      valorDia,
      valor: dias * valorDia,
      detalle: [
        `Días faltantes para la terminación: ${e.diasFaltantes}.`,
        minimoAplicado
          ? 'Se aplicó el mínimo legal de 15 días porque el tiempo faltante era menor.'
          : 'Se indemniza el tiempo faltante completo.',
      ],
    };
  }

  const salarioEnSmmlv = e.salarioBase / smmlv;
  const altoIngreso = salarioEnSmmlv >= UMBRAL_INDEMNIZACION_SMMLV;
  const diasPrimerAnio = altoIngreso ? 20 : 30;
  const diasAdicionales = altoIngreso ? 15 : 20;

  const detalle: string[] = [];
  let dias: number;

  if (e.diasServicio <= 360) {
    // Menos de un año: la indemnización del primer año es proporcional al
    // tiempo servido, nunca inferior a la que corresponde al periodo.
    dias = (diasPrimerAnio * e.diasServicio) / 360;
    detalle.push(
      `Servicio inferior a un año: ${diasPrimerAnio} días × ${e.diasServicio} ÷ 360 = ${dias.toFixed(2)} días.`,
    );
  } else {
    const diasRestantes = e.diasServicio - 360;
    const proporcional = (diasAdicionales * diasRestantes) / 360;
    dias = diasPrimerAnio + proporcional;
    detalle.push(`Primer año: ${diasPrimerAnio} días.`);
    detalle.push(
      `Tiempo adicional (${diasRestantes} días): ${diasAdicionales} × ${diasRestantes} ÷ 360 = ${proporcional.toFixed(2)} días.`,
    );
  }

  detalle.push(
    altoIngreso
      ? `El salario equivale a ${salarioEnSmmlv.toFixed(2)} SMMLV: aplica la tabla de 10 SMMLV o más.`
      : `El salario equivale a ${salarioEnSmmlv.toFixed(2)} SMMLV: aplica la tabla de menos de 10 SMMLV.`,
  );

  return {
    aplica: true,
    regla: altoIngreso
      ? 'Término indefinido, 10 SMMLV o más: 20 días el primer año y 15 por año adicional'
      : 'Término indefinido, menos de 10 SMMLV: 30 días el primer año y 20 por año adicional',
    norma: 'CST art. 64, modificado por la Ley 789 de 2002, art. 28',
    diasIndemnizados: dias,
    valorDia,
    valor: dias * valorDia,
    detalle,
  };
}

/* ══ Liquidación definitiva ══════════════════════════════════════ */

export type CausaTerminacion =
  'renuncia' | 'justaCausa' | 'sinJustaCausa' | 'mutuoAcuerdo' | 'vencimientoPlazo';

export interface EntradaLiquidacion {
  readonly ingreso: FechaISO;
  readonly retiro: FechaISO;
  readonly salarioBase: number;
  readonly auxilioTransporte: number;
  readonly tipoContrato: TipoContrato;
  readonly causa: CausaTerminacion;
  /** Días que faltaban para el vencimiento, en contratos a término fijo. */
  readonly diasFaltantes: number;
  /** Días de vacaciones ya disfrutados o compensados. */
  readonly vacacionesTomadas: number;
  /**
   * Inicio del periodo de prima pendiente. Si se omite, se toma el semestre
   * en curso: 1 de enero o 1 de julio.
   */
  readonly inicioPrima?: FechaISO;
  /** Inicio del periodo de cesantías pendiente. Si se omite, el 1 de enero. */
  readonly inicioCesantias?: FechaISO;
  readonly parametros?: ParametrosManuales;
}

export interface Liquidacion {
  readonly diasServicio: number;
  readonly base: BaseLiquidacion;
  readonly prestaciones: readonly Prestacion[];
  readonly indemnizacion: Indemnizacion | null;
  readonly totalPrestaciones: number;
  readonly total: number;
  readonly avisos: readonly string[];
}

/**
 * Días de servicio en base 360, contando el día de retiro como trabajado.
 *
 * `diasComerciales` mide un intervalo abierto en el extremo final, que es lo
 * correcto para aritmética de calendario. En una liquidación laboral, en
 * cambio, el último día de vinculación es un día trabajado y se paga: del 1 de
 * enero al 31 de diciembre hay 360 días de servicio, no 359.
 */
export function diasServicio360(desde: FechaISO, hasta: FechaISO): number {
  return diasComerciales(desde, hasta) + 1;
}

function inicioSemestre(retiro: FechaISO): FechaISO {
  const anio = retiro.slice(0, 4);
  const mes = Number(retiro.slice(5, 7));
  return mes <= 6 ? `${anio}-01-01` : `${anio}-07-01`;
}

export function liquidar(e: EntradaLiquidacion): Liquidacion {
  const avisos: string[] = [];

  if (e.retiro < e.ingreso) {
    throw new RangeError('La fecha de retiro no puede ser anterior a la de ingreso.');
  }

  const diasServicio = diasServicio360(e.ingreso, e.retiro);
  const base: BaseLiquidacion = {
    salarioBase: e.salarioBase,
    auxilioTransporte: e.auxilioTransporte,
  };

  const desdeCesantias = e.inicioCesantias ?? `${e.retiro.slice(0, 4)}-01-01`;
  const diasCesantias = Math.max(
    0,
    diasServicio360(desdeCesantias < e.ingreso ? e.ingreso : desdeCesantias, e.retiro),
  );

  const desdePrima = e.inicioPrima ?? inicioSemestre(e.retiro);
  const diasPrima = Math.max(
    0,
    diasServicio360(desdePrima < e.ingreso ? e.ingreso : desdePrima, e.retiro),
  );

  const diasVacaciones = Math.max(0, diasServicio - e.vacacionesTomadas * 24);

  const ces = cesantias(base, diasCesantias);
  const int = interesesCesantias(ces.valor, diasCesantias);
  const pri = primaServicios(base, diasPrima);
  const vac = vacaciones(base, diasVacaciones);

  const prestaciones = [ces, int, pri, vac];
  const totalPrestaciones = prestaciones.reduce((s, p) => s + p.valor, 0);

  let ind: Indemnizacion | null = null;
  if (e.causa === 'sinJustaCausa') {
    ind = indemnizacion({
      tipoContrato: e.tipoContrato,
      salarioBase: e.salarioBase,
      diasServicio,
      diasFaltantes: e.diasFaltantes,
      anio: Number(e.retiro.slice(0, 4)),
      parametros: e.parametros,
    });
  } else {
    avisos.push(
      'No se liquida indemnización: solo procede en la terminación sin justa causa imputable al empleador (CST, art. 64).',
    );
  }

  if (e.causa === 'renuncia' || e.causa === 'justaCausa') {
    avisos.push(
      'Las prestaciones sociales se pagan cualquiera que sea la causa de terminación. Lo que no procede es la indemnización.',
    );
  }

  if (diasServicio === 0) {
    avisos.push('El tiempo de servicio es de cero días en base 360. Revise las fechas.');
  }

  avisos.push(
    'El pago debe hacerse al terminar el contrato. La mora genera la indemnización moratoria del art. 65 del CST: un día de salario por cada día de retardo durante los primeros 24 meses.',
  );

  return {
    diasServicio,
    base,
    prestaciones,
    indemnizacion: ind,
    totalPrestaciones,
    total: totalPrestaciones + (ind?.valor ?? 0),
    avisos,
  };
}
