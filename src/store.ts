/**
 * Estado de la aplicación. Persiste en `localStorage` bajo el prefijo del
 * repositorio; nada viaja a un servidor.
 *
 * El estado guarda **entradas**, nunca resultados: los cálculos se derivan del
 * dominio en cada render. Así, cuando cambia una regla normativa, no quedan
 * cifras viejas guardadas que contradigan al motor.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { almacenZustand } from './lib/almacen';
import type { BaseHoraria, ClaseARL } from './domain/parametros';
import type { HorasPorConcepto } from './domain/recargos';
import type { CausaTerminacion, TipoContrato } from './domain/prestaciones';

export interface Configuracion {
  /** Fecha de causación: determina el régimen de jornada y el recargo dominical. */
  fecha: string;
  baseHoraria: BaseHoraria;
  claseARL: ClaseARL;
  empleadorExonerable: boolean;
  salarioIntegral: boolean;
  /** Anulación manual del salario mínimo cuando el año no está confirmado. */
  smmlvManual: number | null;
  auxilioManual: number | null;
}

export interface EntradaNomina {
  salarioMensual: number;
  diasLaborados: number;
  horas: HorasPorConcepto;
  otrosSalariales: number;
  noSalariales: number;
}

export interface EntradaContrato {
  ingreso: string;
  retiro: string;
  tipoContrato: TipoContrato;
  causa: CausaTerminacion;
  diasFaltantes: number;
  vacacionesTomadas: number;
}

export interface Estado {
  config: Configuracion;
  nomina: EntradaNomina;
  contrato: EntradaContrato;
  setConfig: (p: Partial<Configuracion>) => void;
  setNomina: (p: Partial<EntradaNomina>) => void;
  setHoras: (p: HorasPorConcepto) => void;
  setContrato: (p: Partial<EntradaContrato>) => void;
  reiniciar: () => void;
}

const INICIAL = {
  config: {
    fecha: '2026-09-17',
    baseHoraria: 'legal',
    claseARL: 'I',
    empleadorExonerable: true,
    salarioIntegral: false,
    smmlvManual: null,
    auxilioManual: null,
  } satisfies Configuracion,
  nomina: {
    salarioMensual: 1_423_500,
    diasLaborados: 30,
    horas: {},
    otrosSalariales: 0,
    noSalariales: 0,
  } satisfies EntradaNomina,
  contrato: {
    ingreso: '2024-01-15',
    retiro: '2026-09-17',
    tipoContrato: 'indefinido',
    causa: 'sinJustaCausa',
    diasFaltantes: 0,
    vacacionesTomadas: 0,
  } satisfies EntradaContrato,
};

export const useEstado = create<Estado>()(
  persist(
    (set) => ({
      ...structuredClone(INICIAL),
      setConfig: (p) => set((s) => ({ config: { ...s.config, ...p } })),
      setNomina: (p) => set((s) => ({ nomina: { ...s.nomina, ...p } })),
      setHoras: (p) =>
        set((s) => ({ nomina: { ...s.nomina, horas: { ...s.nomina.horas, ...p } } })),
      setContrato: (p) => set((s) => ({ contrato: { ...s.contrato, ...p } })),
      reiniciar: () => set(structuredClone(INICIAL)),
    }),
    {
      name: 'estado',
      version: 1,
      storage: createJSONStorage(() => almacenZustand),
      partialize: (s) => ({ config: s.config, nomina: s.nomina, contrato: s.contrato }),
    },
  ),
);
