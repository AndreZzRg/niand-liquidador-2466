/**
 * Módulo «Comparador»: el mismo periodo liquidado bajo el régimen anterior a
 * la Ley 2466 y bajo cada tramo de su progresión. Es la forma más directa de
 * ver qué cambió y cuánto cuesta.
 */
import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

import { Dato, Insignia, Llamado, Tabla, Tarjeta, Td, Th } from '../brand/ui';
import { calcularDevengado } from '../domain/recargos';
import { finJornadaDiurna, recargoDominical } from '../domain/parametros';
import { numero, pesos, porcentaje } from '../lib/formato';
import { useEstado } from '../store';
import { BarraConfiguracion } from './Configuracion';

/** Fechas de referencia: una por tramo de la progresión del art. 179. */
const HITOS = [
  {
    fecha: '2025-06-30',
    rotulo: 'Antes de la reforma',
    detalle: 'Jornada diurna hasta las 9:00 p. m. · dominical 75 %',
  },
  {
    fecha: '2025-12-01',
    rotulo: 'Julio de 2025',
    detalle: 'Dominical 80 % · jornada aún hasta las 9:00 p. m.',
  },
  {
    fecha: '2026-01-15',
    rotulo: 'Enero de 2026',
    detalle: 'Jornada diurna hasta las 7:00 p. m. · dominical 80 %',
  },
  {
    fecha: '2026-09-17',
    rotulo: 'Julio de 2026',
    detalle: 'Dominical 90 %',
  },
  {
    fecha: '2027-08-01',
    rotulo: 'Julio de 2027',
    detalle: 'Dominical 100 % · régimen completo',
  },
] as const;

export function PanelComparador() {
  const { config, nomina } = useEstado();

  const escenarios = useMemo(
    () =>
      HITOS.map((h) => ({
        ...h,
        resultado: calcularDevengado({
          salarioMensual: nomina.salarioMensual,
          diasLaborados: nomina.diasLaborados,
          horas: nomina.horas,
          otrosSalariales: nomina.otrosSalariales,
          noSalariales: nomina.noSalariales,
          fecha: h.fecha,
          baseHoraria: config.baseHoraria,
          parametros: { smmlv: config.smmlvManual, auxilioTransporte: config.auxilioManual },
        }),
      })),
    [nomina, config],
  );

  const primero = escenarios[0]!;
  const ultimo = escenarios[escenarios.length - 1]!;
  const diferencia = ultimo.resultado.totalDevengado - primero.resultado.totalDevengado;
  const variacion =
    primero.resultado.totalDevengado > 0 ? diferencia / primero.resultado.totalDevengado : 0;

  const sinRecargos = Object.values(nomina.horas).every((h) => !h);

  return (
    <div className="space-y-6">
      <BarraConfiguracion />

      {sinRecargos ? (
        <Llamado tono="info" titulo="Cargue horas para comparar">
          La progresión de la Ley 2466 solo afecta los recargos. Vaya al módulo{' '}
          <strong>Devengado y recargos</strong> y cargue horas dominicales o nocturnas: el
          comparador mostrará entonces cuánto cambia el mismo periodo bajo cada tramo de la reforma.
        </Llamado>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Dato
            rotulo="Antes de la reforma"
            valor={pesos(primero.resultado.totalDevengado)}
            detalle="Régimen vigente hasta junio de 2025"
          />
          <Dato
            rotulo="Régimen completo (2027)"
            valor={pesos(ultimo.resultado.totalDevengado)}
            tono="marca"
          />
          <Dato
            rotulo="Diferencia"
            valor={`${diferencia >= 0 ? '+' : ''}${pesos(diferencia)}`}
            detalle={`${porcentaje(variacion)} sobre el periodo`}
            tono={diferencia > 0 ? 'alerta' : 'neutro'}
          />
        </div>
      )}

      <Tarjeta
        titulo="El mismo periodo bajo cada tramo de la reforma"
        descripcion="Se mantienen fijos el salario, los días y las horas cargadas; solo cambia la fecha de causación."
      >
        <Tabla>
          <thead>
            <tr>
              <Th>Momento</Th>
              <Th numerico>Jornada diurna</Th>
              <Th numerico>Dominical</Th>
              <Th numerico>Recargos</Th>
              <Th numerico>Total devengado</Th>
            </tr>
          </thead>
          <tbody>
            {escenarios.map((e) => {
              const delta = e.resultado.totalRecargos - primero.resultado.totalRecargos;
              return (
                <tr key={e.fecha}>
                  <Td>
                    <span className="font-medium">{e.rotulo}</span>
                    <span className="block text-xs text-texto-3">{e.detalle}</span>
                  </Td>
                  <Td numerico>hasta {finJornadaDiurna(e.fecha)}:00</Td>
                  <Td numerico>{porcentaje(recargoDominical(e.fecha))}</Td>
                  <Td numerico>
                    {pesos(e.resultado.totalRecargos)}
                    {delta > 0 && (
                      <span className="block text-xs text-alerta">+{pesos(delta)}</span>
                    )}
                  </Td>
                  <Td numerico className="font-medium">
                    {pesos(e.resultado.totalDevengado)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Tabla>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Qué cambió con la Ley 2466 de 2025">
          <ul className="space-y-3 text-sm text-texto-2">
            <li className="flex gap-3">
              <Insignia tono="marca">Jornada</Insignia>
              <span>
                La jornada diurna pasó de terminar a las 9:00 p. m. a terminar a las{' '}
                <strong>7:00 p. m.</strong> Dos horas diarias que antes se pagaban sin recargo ahora
                causan el 35 % nocturno. Rige desde el 26 de diciembre de 2025.
              </span>
            </li>
            <li className="flex gap-3">
              <Insignia tono="info">Dominical</Insignia>
              <span>
                El recargo por trabajo dominical y festivo sube del 75 % al 80 % (julio de 2025), al
                90 % (julio de 2026) y al <strong>100 %</strong> (julio de 2027).
              </span>
            </li>
            <li className="flex gap-3">
              <Insignia tono="alerta">RIT</Insignia>
              <span>
                El plazo para actualizar el Reglamento Interno de Trabajo{' '}
                <strong>venció el 25 de junio de 2026</strong>. La Circular 0048 del Ministerio del
                Trabajo precisó que no haberlo actualizado no justifica dejar de aplicar las
                garantías de debido proceso.
              </span>
            </li>
          </ul>
        </Tarjeta>

        <Tarjeta
          titulo="Efecto sobre el costo anual"
          descripcion="Proyección del mismo periodo a doce meses."
        >
          <div className="space-y-3">
            {escenarios.map((e) => {
              const anual = e.resultado.totalDevengado * 12;
              const maximo = ultimo.resultado.totalDevengado * 12;
              const ancho = maximo > 0 ? (anual / maximo) * 100 : 0;
              return (
                <div key={e.fecha}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                    <span className="truncate font-medium">{e.rotulo}</span>
                    <span className="cifra shrink-0 text-texto-2">{pesos(anual)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-superficie-2">
                    <div
                      className="h-full rounded-full bg-marca transition-[width] duration-500"
                      style={{ width: `${ancho}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-5 flex items-start gap-2 border-t border-borde pt-4 text-xs text-texto-3">
            <TrendingUp size={15} className="mt-0.5 shrink-0 text-marca" />
            La proyección multiplica por doce el periodo cargado. Es un supuesto explícito, no una
            estimación de nómina anual: no incorpora prestaciones, aportes ni variación de horas
            entre meses. El sobrecosto de los recargos, en este supuesto, es de{' '}
            {numero(variacion * 100, 1)} % frente al régimen anterior.
          </p>
        </Tarjeta>
      </div>
    </div>
  );
}
