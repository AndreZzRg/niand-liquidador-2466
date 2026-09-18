/**
 * Seguridad social y aportes parafiscales.
 *
 * Fundamento:
 * · Ley 100 de 1993, arts. 18, 20 y 204 — bases y tarifas de pensión y salud.
 * · Ley 797 de 2003, art. 8 — Fondo de Solidaridad Pensional.
 * · Decreto 1772 de 1994, art. 13 — tarifas de riesgos laborales.
 * · Ley 21 de 1982 — aportes a caja de compensación, SENA e ICBF.
 * · Estatuto Tributario, art. 114-1 — exoneración de aportes del empleador.
 * · Ley 1393 de 2010, art. 30 — límite del 40 % a los pagos no salariales.
 */
import {
  APORTES,
  LIMITE_NO_SALARIAL,
  TOPE_IBC_SMMLV,
  UMBRAL_EXONERACION_SMMLV,
  resolverParametros,
  tarifaARL,
  tarifaFSP,
  type ClaseARL,
  type ParametrosManuales,
} from './parametros';

export interface EntradaAportes {
  /** Pagos que constituyen salario en el periodo. */
  readonly salarial: number;
  /** Pagos pactados como no constitutivos de salario. */
  readonly noSalarial: number;
  readonly anio: number;
  readonly claseARL: ClaseARL;
  /**
   * El empleador es contribuyente del impuesto de renta y, por tanto, sujeto
   * de la exoneración del art. 114-1 del Estatuto Tributario.
   */
  readonly empleadorExonerable: boolean;
  /** Salario integral: la base de cotización es el 70 % (CST, art. 132). */
  readonly salarioIntegral: boolean;
  readonly parametros?: ParametrosManuales;
}

export interface LineaAporte {
  readonly concepto: string;
  readonly norma: string;
  readonly tarifa: number;
  readonly aCargoDe: 'trabajador' | 'empleador';
  readonly valor: number;
  readonly exonerado?: boolean;
}

export interface Aportes {
  readonly ibc: number;
  readonly ibcSinTopes: number;
  readonly lineas: readonly LineaAporte[];
  readonly totalTrabajador: number;
  readonly totalEmpleador: number;
  /** Costo del empleador: salario más aportes a su cargo. */
  readonly costoEmpleador: number;
  readonly avisos: readonly string[];
}

/**
 * Ingreso base de cotización.
 *
 * Se parte de los pagos salariales. Si los pagos no salariales exceden el 40 %
 * de la remuneración total, el exceso se incorpora al IBC (Ley 1393 de 2010,
 * art. 30). En el salario integral la base es el 70 % (CST, art. 132).
 * El resultado se acota entre 1 y 25 salarios mínimos.
 */
export function calcularIBC(e: EntradaAportes): {
  ibc: number;
  sinTopes: number;
  avisos: string[];
} {
  const avisos: string[] = [];
  const { smmlv } = resolverParametros(e.anio, e.parametros);

  const remuneracionTotal = e.salarial + e.noSalarial;
  let base = e.salarial;

  if (remuneracionTotal > 0) {
    const maximoNoSalarial = remuneracionTotal * LIMITE_NO_SALARIAL;
    if (e.noSalarial > maximoNoSalarial) {
      const exceso = e.noSalarial - maximoNoSalarial;
      base += exceso;
      avisos.push(
        `Los pagos no salariales exceden el 40 % de la remuneración total. El exceso se incorporó al IBC (Ley 1393 de 2010, art. 30).`,
      );
    }
  }

  if (e.salarioIntegral) {
    base = base * 0.7;
    avisos.push('Salario integral: la base de cotización corresponde al 70 % (CST, art. 132).');
  }

  const sinTopes = base;
  const piso = smmlv;
  const techo = smmlv * TOPE_IBC_SMMLV;

  if (base < piso) {
    avisos.push('El IBC se elevó al salario mínimo, que es el piso legal de cotización.');
    base = piso;
  }
  if (base > techo) {
    avisos.push(
      `El IBC se limitó a ${TOPE_IBC_SMMLV} salarios mínimos (Ley 100 de 1993, art. 18).`,
    );
    base = techo;
  }

  return { ibc: base, sinTopes, avisos };
}

export function calcularAportes(e: EntradaAportes): Aportes {
  const { smmlv, verificado, fuente } = resolverParametros(e.anio, e.parametros);
  const { ibc, sinTopes, avisos } = calcularIBC(e);

  if (!verificado) avisos.push(`Parámetros de ${e.anio} sin confirmar: ${fuente}`);

  const ibcEnSmmlv = ibc / smmlv;
  const exonerado = e.empleadorExonerable && ibcEnSmmlv < UMBRAL_EXONERACION_SMMLV;

  if (exonerado) {
    avisos.push(
      `El trabajador devenga menos de ${UMBRAL_EXONERACION_SMMLV} SMMLV: el empleador queda exonerado de salud, SENA e ICBF (Estatuto Tributario, art. 114-1).`,
    );
  }

  const fsp = tarifaFSP(ibcEnSmmlv);
  const arl = tarifaARL(e.claseARL);

  const lineas: LineaAporte[] = [
    {
      concepto: 'Salud',
      norma: 'Ley 100 de 1993, art. 204',
      tarifa: APORTES.saludTrabajador,
      aCargoDe: 'trabajador',
      valor: ibc * APORTES.saludTrabajador,
    },
    {
      concepto: 'Pensión',
      norma: 'Ley 100 de 1993, art. 20',
      tarifa: APORTES.pensionTrabajador,
      aCargoDe: 'trabajador',
      valor: ibc * APORTES.pensionTrabajador,
    },
    {
      concepto: 'Salud',
      norma: 'Ley 100 de 1993, art. 204 · E.T. art. 114-1',
      tarifa: exonerado ? 0 : APORTES.saludEmpleador,
      aCargoDe: 'empleador',
      valor: exonerado ? 0 : ibc * APORTES.saludEmpleador,
      exonerado,
    },
    {
      concepto: 'Pensión',
      norma: 'Ley 100 de 1993, art. 20',
      tarifa: APORTES.pensionEmpleador,
      aCargoDe: 'empleador',
      valor: ibc * APORTES.pensionEmpleador,
    },
    {
      concepto: `Riesgos laborales (clase ${e.claseARL})`,
      norma: 'Decreto 1772 de 1994, art. 13',
      tarifa: arl,
      aCargoDe: 'empleador',
      valor: ibc * arl,
    },
    {
      concepto: 'Caja de compensación familiar',
      norma: 'Ley 21 de 1982',
      tarifa: APORTES.caja,
      aCargoDe: 'empleador',
      valor: ibc * APORTES.caja,
    },
    {
      concepto: 'SENA',
      norma: 'Ley 21 de 1982 · E.T. art. 114-1',
      tarifa: exonerado ? 0 : APORTES.sena,
      aCargoDe: 'empleador',
      valor: exonerado ? 0 : ibc * APORTES.sena,
      exonerado,
    },
    {
      concepto: 'ICBF',
      norma: 'Ley 21 de 1982 · E.T. art. 114-1',
      tarifa: exonerado ? 0 : APORTES.icbf,
      aCargoDe: 'empleador',
      valor: exonerado ? 0 : ibc * APORTES.icbf,
      exonerado,
    },
  ];

  if (fsp > 0) {
    lineas.splice(2, 0, {
      concepto: 'Fondo de Solidaridad Pensional',
      norma: 'Ley 797 de 2003, art. 8',
      tarifa: fsp,
      aCargoDe: 'trabajador',
      valor: ibc * fsp,
    });
    avisos.push(
      `El IBC equivale a ${ibcEnSmmlv.toFixed(2)} SMMLV: se causa el aporte al Fondo de Solidaridad Pensional.`,
    );
  }

  const totalTrabajador = lineas
    .filter((l) => l.aCargoDe === 'trabajador')
    .reduce((s, l) => s + l.valor, 0);
  const totalEmpleador = lineas
    .filter((l) => l.aCargoDe === 'empleador')
    .reduce((s, l) => s + l.valor, 0);

  return {
    ibc,
    ibcSinTopes: sinTopes,
    lineas,
    totalTrabajador,
    totalEmpleador,
    costoEmpleador: e.salarial + e.noSalarial + totalEmpleador,
    avisos,
  };
}

/**
 * Provisión mensual de prestaciones sociales, en porcentaje del salario.
 * Es la cifra que un empleador necesita para presupuestar el costo real.
 */
export const PROVISIONES = [
  { concepto: 'Cesantías', tarifa: 0.0833, norma: 'CST art. 249' },
  { concepto: 'Intereses a las cesantías', tarifa: 0.01, norma: 'Ley 52 de 1975' },
  { concepto: 'Prima de servicios', tarifa: 0.0833, norma: 'CST art. 306' },
  { concepto: 'Vacaciones', tarifa: 0.0417, norma: 'CST art. 186' },
] as const;

export function provisionesMensuales(baseSalarial: number, baseConAuxilio: number) {
  return PROVISIONES.map((p) => ({
    ...p,
    // Las vacaciones se provisionan sobre el salario; el resto, con auxilio.
    base: p.concepto === 'Vacaciones' ? baseSalarial : baseConAuxilio,
    valor: (p.concepto === 'Vacaciones' ? baseSalarial : baseConAuxilio) * p.tarifa,
  }));
}
