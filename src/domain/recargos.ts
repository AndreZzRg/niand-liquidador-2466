/**
 * Recargos, horas extra y devengado del periodo.
 *
 * Fundamento: CST, arts. 127, 128, 160, 168 y 179, con las modificaciones de
 * la Ley 2466 de 2025 (jornada diurna hasta las 7:00 p. m. y progresión del
 * recargo dominical y festivo).
 *
 * Todas las funciones son puras: la fecha de causación entra como parámetro
 * porque de ella dependen tanto el régimen de jornada como el recargo dominical.
 */
import {
  INICIO_DIURNA,
  RECARGO_EXTRA_DIURNA,
  RECARGO_EXTRA_NOCTURNA,
  RECARGO_NOCTURNO,
  TOPE_AUXILIO_SMMLV,
  finJornadaDiurna,
  horasMensuales,
  recargoDominical,
  resolverParametros,
  type BaseHoraria,
  type ParametrosManuales,
} from './parametros';

/* ══ Clasificación de un turno ═══════════════════════════════════ */

export interface Turno {
  /** Hora de inicio en formato decimal: 22.5 son las 10:30 p. m. */
  readonly inicio: number;
  /** Duración en horas. Puede cruzar la medianoche. */
  readonly duracion: number;
}

export interface ReparteJornada {
  readonly diurnas: number;
  readonly nocturnas: number;
}

/**
 * Horas de `[inicio, inicio + duracion)` que caen dentro de la ventana
 * `[ventanaInicio, ventanaFin)` repetida cada 24 horas.
 */
function horasEnVentana(
  inicio: number,
  duracion: number,
  ventanaInicio: number,
  ventanaFin: number,
): number {
  let total = 0;
  const vueltas = Math.ceil(duracion / 24) + 1;
  for (let k = -1; k <= vueltas; k++) {
    const a = Math.max(inicio, ventanaInicio + 24 * k);
    const b = Math.min(inicio + duracion, ventanaFin + 24 * k);
    if (b > a) total += b - a;
  }
  return total;
}

/**
 * Reparte un turno entre jornada diurna y nocturna según el régimen vigente
 * en la fecha. Desde el 26 de diciembre de 2025 la diurna termina a las
 * 7:00 p. m.; antes terminaba a las 9:00 p. m. (Ley 2466 de 2025, art. 2,
 * que modifica el art. 160 del CST).
 */
export function repartirJornada(turno: Turno, fecha: string): ReparteJornada {
  if (turno.duracion <= 0) return { diurnas: 0, nocturnas: 0 };
  const inicio = ((turno.inicio % 24) + 24) % 24;
  const diurnas = horasEnVentana(inicio, turno.duracion, INICIO_DIURNA, finJornadaDiurna(fecha));
  return {
    diurnas: redondearHoras(diurnas),
    nocturnas: redondearHoras(turno.duracion - diurnas),
  };
}

function redondearHoras(h: number): number {
  return Math.round(h * 1e6) / 1e6;
}

/**
 * Cuántas horas de un turno cambian de diurnas a nocturnas por efecto de la
 * Ley 2466. Sirve para mostrar el impacto concreto de la reforma.
 */
export function horasReclasificadasPor2466(turno: Turno): number {
  const antes = repartirJornada(turno, '2025-01-01');
  const despues = repartirJornada(turno, '2026-01-01');
  return redondearHoras(despues.nocturnas - antes.nocturnas);
}

/* ══ Conceptos de recargo ════════════════════════════════════════ */

export type ConceptoRecargo =
  | 'recargoNocturno'
  | 'extraDiurna'
  | 'extraNocturna'
  | 'dominicalDiurna'
  | 'dominicalNocturna'
  | 'extraDiurnaDominical'
  | 'extraNocturnaDominical';

export interface DefinicionConcepto {
  readonly id: ConceptoRecargo;
  readonly nombre: string;
  readonly sigla: string;
  readonly norma: string;
  /** Factor sobre el valor de la hora ordinaria, dada la fecha de causación. */
  readonly factor: (fecha: string) => number;
  readonly explicacion: string;
}

export const CONCEPTOS: readonly DefinicionConcepto[] = [
  {
    id: 'recargoNocturno',
    nombre: 'Recargo nocturno',
    sigla: 'RN',
    norma: 'CST art. 168 num. 1',
    factor: () => RECARGO_NOCTURNO,
    explicacion:
      'Hora ordinaria trabajada en jornada nocturna. La hora ya está pagada en el salario; solo se añade el 35 %.',
  },
  {
    id: 'extraDiurna',
    nombre: 'Hora extra diurna',
    sigla: 'HED',
    norma: 'CST art. 168 num. 2',
    factor: () => 1 + RECARGO_EXTRA_DIURNA,
    explicacion:
      'Hora que excede la jornada ordinaria, trabajada en franja diurna. Se paga al 125 %.',
  },
  {
    id: 'extraNocturna',
    nombre: 'Hora extra nocturna',
    sigla: 'HEN',
    norma: 'CST art. 168 num. 3',
    factor: () => 1 + RECARGO_EXTRA_NOCTURNA,
    explicacion:
      'Hora que excede la jornada ordinaria, trabajada en franja nocturna. Se paga al 175 %.',
  },
  {
    id: 'dominicalDiurna',
    nombre: 'Recargo dominical o festivo diurno',
    sigla: 'RD',
    norma: 'CST art. 179, modificado por la Ley 2466 de 2025',
    factor: (f) => recargoDominical(f),
    explicacion:
      'Hora ordinaria trabajada en domingo o festivo. La hora ya está en el salario; se añade el recargo vigente.',
  },
  {
    id: 'dominicalNocturna',
    nombre: 'Recargo dominical o festivo nocturno',
    sigla: 'RDN',
    norma: 'CST arts. 168 y 179',
    factor: (f) => recargoDominical(f) + RECARGO_NOCTURNO,
    explicacion: 'Los recargos por trabajo dominical y por trabajo nocturno son acumulables.',
  },
  {
    id: 'extraDiurnaDominical',
    nombre: 'Hora extra diurna dominical o festiva',
    sigla: 'HEDD',
    norma: 'CST arts. 168 y 179',
    factor: (f) => 1 + RECARGO_EXTRA_DIURNA + recargoDominical(f),
    explicacion: 'Hora extra en domingo o festivo, franja diurna.',
  },
  {
    id: 'extraNocturnaDominical',
    nombre: 'Hora extra nocturna dominical o festiva',
    sigla: 'HEND',
    norma: 'CST arts. 168 y 179',
    factor: (f) => 1 + RECARGO_EXTRA_NOCTURNA + recargoDominical(f),
    explicacion: 'Hora extra en domingo o festivo, franja nocturna.',
  },
] as const;

export function conceptoPorId(id: ConceptoRecargo): DefinicionConcepto {
  const c = CONCEPTOS.find((x) => x.id === id);
  if (!c) throw new RangeError(`Concepto de recargo desconocido: "${id}"`);
  return c;
}

/* ══ Devengado del periodo ═══════════════════════════════════════ */

export type HorasPorConcepto = Partial<Record<ConceptoRecargo, number>>;

export interface EntradaDevengado {
  /** Salario básico mensual pactado, en pesos. */
  readonly salarioMensual: number;
  /** Días del mes efectivamente laborados o remunerados (0 a 30). */
  readonly diasLaborados: number;
  readonly horas: HorasPorConcepto;
  /** Pagos salariales adicionales: comisiones, bonificaciones habituales. */
  readonly otrosSalariales: number;
  /** Pagos pactados como no constitutivos de salario (CST, art. 128). */
  readonly noSalariales: number;
  /** Fecha de causación del periodo, en formato ISO. Determina los recargos. */
  readonly fecha: string;
  readonly baseHoraria: BaseHoraria;
  /** Anulación manual del salario mínimo y del auxilio de transporte. */
  readonly parametros?: ParametrosManuales;
}

export interface LineaRecargo {
  readonly concepto: DefinicionConcepto;
  readonly horas: number;
  readonly factor: number;
  readonly valorHora: number;
  readonly total: number;
}

export interface Devengado {
  readonly valorHoraOrdinaria: number;
  readonly sueldoProporcional: number;
  readonly auxilioTransporte: number;
  readonly lineas: readonly LineaRecargo[];
  readonly totalRecargos: number;
  readonly otrosSalariales: number;
  readonly noSalariales: number;
  /** Suma de todo lo que constituye salario. */
  readonly totalSalarial: number;
  /** Lo que recibe el trabajador antes de deducciones. */
  readonly totalDevengado: number;
  /** Advertencias que la interfaz debe mostrar sin que el usuario interactúe. */
  readonly avisos: readonly string[];
}

/** Valor de una hora ordinaria de trabajo. */
export function valorHoraOrdinaria(
  salarioMensual: number,
  baseHoraria: BaseHoraria,
  fecha: string,
): number {
  return salarioMensual / horasMensuales(baseHoraria, fecha);
}

/**
 * ¿Tiene derecho a auxilio de transporte? Lo tiene quien devengue hasta dos
 * salarios mínimos (Ley 15 de 1959 y decretos anuales). El auxilio no es
 * salario, pero sí entra en la base de prestaciones (CST, art. 7 de la Ley 1ª
 * de 1963).
 */
export function tieneAuxilioTransporte(
  salarioMensual: number,
  anio: number,
  manual?: ParametrosManuales,
): boolean {
  const { smmlv } = resolverParametros(anio, manual);
  return salarioMensual <= smmlv * TOPE_AUXILIO_SMMLV;
}

export function calcularDevengado(entrada: EntradaDevengado): Devengado {
  const avisos: string[] = [];
  const anio = Number(entrada.fecha.slice(0, 4));
  const params = resolverParametros(anio, entrada.parametros);

  if (!params.verificado) {
    avisos.push(
      `Los parámetros de ${anio} no están confirmados: ${params.fuente} Ajústelos antes de usar el resultado.`,
    );
  }

  const dias = Math.min(Math.max(entrada.diasLaborados, 0), 30);
  if (entrada.diasLaborados > 30) {
    avisos.push('El mes laboral se cuenta de 30 días; se tomaron 30 (CST, art. 127).');
  }
  if (entrada.salarioMensual < params.smmlv) {
    avisos.push(
      `El salario informado está por debajo del salario mínimo de ${anio}. Verifique si corresponde a jornada parcial (CST, art. 147).`,
    );
  }

  const vho = valorHoraOrdinaria(entrada.salarioMensual, entrada.baseHoraria, entrada.fecha);
  const sueldoProporcional = (entrada.salarioMensual / 30) * dias;

  const auxilio = tieneAuxilioTransporte(entrada.salarioMensual, anio, entrada.parametros)
    ? (params.auxilioTransporte / 30) * dias
    : 0;

  const lineas: LineaRecargo[] = [];
  for (const concepto of CONCEPTOS) {
    const horas = entrada.horas[concepto.id] ?? 0;
    if (horas <= 0) continue;
    const factor = concepto.factor(entrada.fecha);
    lineas.push({
      concepto,
      horas,
      factor,
      valorHora: vho,
      total: horas * vho * factor,
    });
  }

  const horasExtra =
    (entrada.horas.extraDiurna ?? 0) +
    (entrada.horas.extraNocturna ?? 0) +
    (entrada.horas.extraDiurnaDominical ?? 0) +
    (entrada.horas.extraNocturnaDominical ?? 0);

  if (horasExtra > 24) {
    avisos.push(
      'Las horas extra exceden el máximo de 2 diarias y 12 semanales del art. 22 de la Ley 50 de 1990. Requieren autorización del Ministerio del Trabajo.',
    );
  }

  const totalRecargos = lineas.reduce((s, l) => s + l.total, 0);
  const totalSalarial = sueldoProporcional + totalRecargos + entrada.otrosSalariales;
  const totalDevengado = totalSalarial + auxilio + entrada.noSalariales;

  const remuneracionTotal = totalSalarial + entrada.noSalariales;
  if (remuneracionTotal > 0 && entrada.noSalariales / remuneracionTotal > 0.4) {
    avisos.push(
      'Los pagos no constitutivos de salario superan el 40 % de la remuneración total. Para efectos del IBC se limitan a ese tope (Ley 1393 de 2010, art. 30).',
    );
  }

  return {
    valorHoraOrdinaria: vho,
    sueldoProporcional,
    auxilioTransporte: auxilio,
    lineas,
    totalRecargos,
    otrosSalariales: entrada.otrosSalariales,
    noSalariales: entrada.noSalariales,
    totalSalarial,
    totalDevengado,
    avisos,
  };
}
