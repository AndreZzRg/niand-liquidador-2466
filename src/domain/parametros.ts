/**
 * Parámetros anuales y topes del régimen laboral colombiano.
 *
 * Cada valor declara su fuente y si está verificado contra el acto que lo
 * fija. Un parámetro sin confirmar se marca y la interfaz lo advierte: es
 * preferible una cifra señalada como pendiente que una cifra inventada que
 * el usuario no puede distinguir de un dato oficial.
 */

export interface ParametrosAnio {
  readonly anio: number;
  /** Salario mínimo mensual legal vigente, en pesos. */
  readonly smmlv: number;
  /** Auxilio de transporte mensual, en pesos. */
  readonly auxilioTransporte: number;
  /** Unidad de Valor Tributario. */
  readonly uvt: number;
  /** Acto administrativo que fija los valores. */
  readonly fuente: string;
  /** `false` cuando el valor aún no se ha contrastado contra el decreto. */
  readonly verificado: boolean;
}

/**
 * Valores por año. Los de 2024 y 2025 están contrastados contra el decreto
 * correspondiente. El de 2026 arrastra el último valor verificado y queda
 * marcado como pendiente: debe editarse en la interfaz antes de usar el
 * resultado en una decisión real.
 */
export const PARAMETROS: readonly ParametrosAnio[] = [
  {
    anio: 2024,
    smmlv: 1_300_000,
    auxilioTransporte: 162_000,
    uvt: 47_065,
    fuente: 'Decreto 2292 de 2023 (salario) y Decreto 2231 de 2023 (auxilio)',
    verificado: true,
  },
  {
    anio: 2025,
    smmlv: 1_423_500,
    auxilioTransporte: 200_000,
    uvt: 49_799,
    fuente: 'Decreto 1572 de 2024 (salario y auxilio de transporte)',
    verificado: true,
  },
  {
    anio: 2026,
    smmlv: 1_423_500,
    auxilioTransporte: 200_000,
    uvt: 49_799,
    fuente:
      'PENDIENTE. Arrastra los valores de 2025. Confirme contra el decreto de salario mínimo para 2026 antes de usar el resultado.',
    verificado: false,
  },
] as const;

export const ANIO_BASE = 2026;

export function parametrosDe(anio: number): ParametrosAnio {
  const exacto = PARAMETROS.find((p) => p.anio === anio);
  if (exacto) return exacto;
  // Fuera de rango: se devuelve el año más cercano y se marca como no verificado.
  const ultimo = PARAMETROS[PARAMETROS.length - 1]!;
  const primero = PARAMETROS[0]!;
  const cercano = anio < primero.anio ? primero : ultimo;
  return {
    ...cercano,
    anio,
    verificado: false,
    fuente: `PENDIENTE. Se aplicaron los valores de ${cercano.anio}; no hay parámetros cargados para ${anio}.`,
  };
}

/**
 * Anulación manual de los parámetros del año. Existe porque un valor anual
 * puede no estar confirmado todavía en este repositorio: antes que aplicar
 * una cifra inventada, se deja que el usuario escriba la oficial.
 */
export interface ParametrosManuales {
  readonly smmlv?: number | null;
  readonly auxilioTransporte?: number | null;
}

export function resolverParametros(anio: number, manual?: ParametrosManuales): ParametrosAnio {
  const base = parametrosDe(anio);
  const smmlv = manual?.smmlv ?? null;
  const auxilio = manual?.auxilioTransporte ?? null;
  if (smmlv === null && auxilio === null) return base;
  return {
    ...base,
    smmlv: smmlv ?? base.smmlv,
    auxilioTransporte: auxilio ?? base.auxilioTransporte,
    verificado: true,
    fuente:
      'Valores ajustados a mano por el usuario. La responsabilidad de la cifra es de quien la escribió.',
  };
}

/* ── Topes y umbrales ────────────────────────────────────────────── */

/** Tope máximo del ingreso base de cotización, en SMMLV (Ley 100 de 1993, art. 18). */
export const TOPE_IBC_SMMLV = 25;

/** El auxilio de transporte se debe a quien devenga hasta 2 SMMLV (Ley 15 de 1959). */
export const TOPE_AUXILIO_SMMLV = 2;

/**
 * Umbral de exoneración de aportes del empleador en salud, SENA e ICBF
 * (Estatuto Tributario, art. 114-1): aplica a los trabajadores que devenguen
 * menos de 10 SMMLV, cuando el empleador es contribuyente del impuesto de renta.
 */
export const UMBRAL_EXONERACION_SMMLV = 10;

/**
 * Umbral del art. 64 del CST para determinar la tabla de indemnización por
 * despido sin justa causa en el contrato a término indefinido.
 */
export const UMBRAL_INDEMNIZACION_SMMLV = 10;

/**
 * Límite del art. 30 de la Ley 1393 de 2010: los pagos que las partes acuerden
 * como no constitutivos de salario no pueden exceder el 40 % del total de la
 * remuneración para efectos del ingreso base de cotización.
 */
export const LIMITE_NO_SALARIAL = 0.4;

/* ── Jornada ─────────────────────────────────────────────────────── */

/**
 * Máximo de la jornada ordinaria semanal, reducida de forma gradual por la
 * Ley 2101 de 2021 sin disminución de salario ni de derechos.
 */
export const JORNADA_SEMANAL: readonly { readonly desde: string; readonly horas: number }[] = [
  { desde: '2023-07-15', horas: 47 },
  { desde: '2024-07-15', horas: 46 },
  { desde: '2025-07-15', horas: 44 },
  { desde: '2026-07-15', horas: 42 },
] as const;

export function jornadaSemanal(fecha: string): number {
  let horas = 48; // Régimen anterior a la Ley 2101 de 2021.
  for (const tramo of JORNADA_SEMANAL) {
    if (fecha >= tramo.desde) horas = tramo.horas;
  }
  return horas;
}

/**
 * Divisor mensual para obtener el valor de la hora ordinaria.
 *
 * `legal` — 240 horas. Es el divisor tradicional (30 días × 8 horas) y el que
 *   el Ministerio del Trabajo ha sostenido que se conserva, porque la Ley 2101
 *   de 2021 reduce la jornada sin reducir el salario mensual.
 * `jornadaReal` — proyecta la jornada semanal vigente al mes (semanas × 30 / 7).
 *   Produce un valor de hora más alto. Algunos empleadores lo pactan.
 *
 * La elección cambia el resultado, así que se expone al usuario en lugar de
 * decidirse en silencio.
 */
export type BaseHoraria = 'legal' | 'jornadaReal';

export function horasMensuales(base: BaseHoraria, fecha: string): number {
  if (base === 'legal') return 240;
  return (jornadaSemanal(fecha) * 30) / 7;
}

/* ── Recargos ────────────────────────────────────────────────────── */

/** Recargo por trabajo nocturno (CST, art. 168, num. 1). */
export const RECARGO_NOCTURNO = 0.35;

/** Recargo de la hora extra diurna (CST, art. 168, num. 2). */
export const RECARGO_EXTRA_DIURNA = 0.25;

/** Recargo de la hora extra nocturna (CST, art. 168, num. 3). */
export const RECARGO_EXTRA_NOCTURNA = 0.75;

/**
 * Progresión del recargo por trabajo dominical y festivo introducida por la
 * Ley 2466 de 2025, que modifica el art. 179 del CST.
 */
export const PROGRESION_DOMINICAL: readonly { readonly desde: string; readonly recargo: number }[] =
  [
    { desde: '0000-01-01', recargo: 0.75 },
    { desde: '2025-07-01', recargo: 0.8 },
    { desde: '2026-07-01', recargo: 0.9 },
    { desde: '2027-07-01', recargo: 1.0 },
  ] as const;

export function recargoDominical(fecha: string): number {
  let recargo = 0.75;
  for (const tramo of PROGRESION_DOMINICAL) {
    if (fecha >= tramo.desde) recargo = tramo.recargo;
  }
  return recargo;
}

/**
 * Fin de la jornada diurna.
 *
 * La Ley 2466 de 2025 modificó el art. 160 del CST: la jornada diurna va de
 * las 6:00 a. m. a las 7:00 p. m. y la nocturna, de las 7:00 p. m. a las
 * 6:00 a. m. El cambio rige desde el 26 de diciembre de 2025, seis meses
 * después de la promulgación de la ley. Antes, la diurna terminaba a las
 * 9:00 p. m.
 */
export const VIGENCIA_JORNADA_2466 = '2025-12-26';
export const INICIO_DIURNA = 6;

export function finJornadaDiurna(fecha: string): number {
  return fecha >= VIGENCIA_JORNADA_2466 ? 19 : 21;
}

/* ── Seguridad social y parafiscales ─────────────────────────────── */

export const APORTES = {
  saludTrabajador: 0.04,
  saludEmpleador: 0.085,
  pensionTrabajador: 0.04,
  pensionEmpleador: 0.12,
  caja: 0.04,
  sena: 0.02,
  icbf: 0.03,
} as const;

/** Tarifas de riesgos laborales por clase (Decreto 1772 de 1994, art. 13). */
export const CLASES_ARL = [
  { clase: 'I', tarifa: 0.00522, ejemplo: 'Actividades administrativas y financieras' },
  { clase: 'II', tarifa: 0.01044, ejemplo: 'Manufactura ligera y comercio' },
  { clase: 'III', tarifa: 0.02436, ejemplo: 'Manufactura pesada y transporte' },
  { clase: 'IV', tarifa: 0.0435, ejemplo: 'Construcción y minería a cielo abierto' },
  { clase: 'V', tarifa: 0.0696, ejemplo: 'Minería subterránea, explosivos y alturas' },
] as const;

export type ClaseARL = (typeof CLASES_ARL)[number]['clase'];

export function tarifaARL(clase: ClaseARL): number {
  return CLASES_ARL.find((c) => c.clase === clase)?.tarifa ?? CLASES_ARL[0].tarifa;
}

/**
 * Aporte al Fondo de Solidaridad Pensional (Ley 100 de 1993, art. 27, y
 * Ley 797 de 2003, art. 8). Lo asume por completo el trabajador y se calcula
 * sobre el ingreso base de cotización expresado en salarios mínimos.
 */
export function tarifaFSP(ibcEnSmmlv: number): number {
  if (ibcEnSmmlv < 4) return 0;
  if (ibcEnSmmlv < 16) return 0.01;
  if (ibcEnSmmlv < 17) return 0.012;
  if (ibcEnSmmlv < 18) return 0.014;
  if (ibcEnSmmlv < 19) return 0.016;
  if (ibcEnSmmlv < 20) return 0.018;
  return 0.02;
}

/** Tasa anual de los intereses a las cesantías (Ley 52 de 1975, art. 1). */
export const TASA_INTERESES_CESANTIAS = 0.12;
