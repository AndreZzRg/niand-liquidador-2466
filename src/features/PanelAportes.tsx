/**
 * Módulo «Seguridad social y parafiscales»: ingreso base de cotización,
 * aportes de cada parte y costo real del empleador.
 */
import { useMemo } from 'react';
import { Info } from 'lucide-react';

import { Dato, Insignia, Llamado, Tabla, Tarjeta, Td, Th } from '../brand/ui';
import { calcularAportes, provisionesMensuales } from '../domain/aportes';
import { calcularDevengado, tieneAuxilioTransporte } from '../domain/recargos';
import { numero, pesos, porcentaje } from '../lib/formato';
import { useEstado } from '../store';
import { BarraConfiguracion, useParametrosEfectivos } from './Configuracion';

export function PanelAportes() {
  const { config, nomina } = useEstado();
  const { anio, smmlv, auxilioTransporte } = useParametrosEfectivos();
  const manual = { smmlv: config.smmlvManual, auxilioTransporte: config.auxilioManual };

  const devengado = useMemo(
    () =>
      calcularDevengado({
        salarioMensual: nomina.salarioMensual,
        diasLaborados: nomina.diasLaborados,
        horas: nomina.horas,
        otrosSalariales: nomina.otrosSalariales,
        noSalariales: nomina.noSalariales,
        fecha: config.fecha,
        baseHoraria: config.baseHoraria,
        parametros: manual,
      }),
    // `manual` se reconstruye en cada render; las dependencias reales son sus valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nomina, config],
  );

  const aportes = useMemo(
    () =>
      calcularAportes({
        salarial: devengado.totalSalarial,
        noSalarial: nomina.noSalariales,
        anio,
        claseARL: config.claseARL,
        empleadorExonerable: config.empleadorExonerable,
        salarioIntegral: config.salarioIntegral,
        parametros: manual,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devengado.totalSalarial, nomina.noSalariales, anio, config],
  );

  const conAuxilio = tieneAuxilioTransporte(nomina.salarioMensual, anio, manual)
    ? auxilioTransporte
    : 0;
  const provisiones = provisionesMensuales(
    nomina.salarioMensual,
    nomina.salarioMensual + conAuxilio,
  );
  const totalProvisiones = provisiones.reduce((s, p) => s + p.valor, 0);

  const netoTrabajador = devengado.totalDevengado - aportes.totalTrabajador;
  const costoTotal = aportes.costoEmpleador + totalProvisiones;

  return (
    <div className="space-y-6">
      <BarraConfiguracion />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato
          rotulo="Ingreso base de cotización"
          valor={pesos(aportes.ibc)}
          detalle={`${numero(aportes.ibc / smmlv)} SMMLV`}
          tono="marca"
        />
        <Dato
          rotulo="Deducciones al trabajador"
          valor={pesos(aportes.totalTrabajador)}
          tono="riesgo"
        />
        <Dato rotulo="Neto a pagar" valor={pesos(netoTrabajador)} tono="ok" />
        <Dato
          rotulo="Costo total del empleador"
          valor={pesos(costoTotal)}
          detalle="Remuneración + aportes + provisiones"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta
          titulo="Aportes a la seguridad social y parafiscales"
          descripcion={`Calculados sobre un IBC de ${pesos(aportes.ibc)}`}
        >
          <Tabla>
            <thead>
              <tr>
                <Th>Concepto</Th>
                <Th>A cargo de</Th>
                <Th numerico>Tarifa</Th>
                <Th numerico>Valor</Th>
              </tr>
            </thead>
            <tbody>
              {aportes.lineas.map((l, i) => (
                <tr key={`${l.concepto}-${l.aCargoDe}-${i}`}>
                  <Td>
                    <span className="font-medium">{l.concepto}</span>
                    <span className="block text-xs text-texto-3">{l.norma}</span>
                  </Td>
                  <Td>
                    <Insignia tono={l.aCargoDe === 'trabajador' ? 'info' : 'marca'}>
                      {l.aCargoDe}
                    </Insignia>
                  </Td>
                  <Td numerico>{porcentaje(l.tarifa, 3)}</Td>
                  <Td numerico className={l.exonerado ? 'text-texto-3' : 'font-medium'}>
                    {l.exonerado ? 'Exonerado' : pesos(l.valor)}
                  </Td>
                </tr>
              ))}
              <tr className="bg-superficie-2">
                <Td className="font-display font-semibold">Total trabajador</Td>
                <Td />
                <Td />
                <Td numerico className="font-semibold">
                  {pesos(aportes.totalTrabajador)}
                </Td>
              </tr>
              <tr className="bg-superficie-2">
                <Td className="font-display font-semibold">Total empleador</Td>
                <Td />
                <Td />
                <Td numerico className="font-semibold">
                  {pesos(aportes.totalEmpleador)}
                </Td>
              </tr>
            </tbody>
          </Tabla>
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta
            titulo="Provisión mensual de prestaciones"
            descripcion="Lo que hay que reservar cada mes para no quedar corto en la liquidación."
          >
            <Tabla>
              <thead>
                <tr>
                  <Th>Concepto</Th>
                  <Th numerico>Tarifa</Th>
                  <Th numerico>Provisión</Th>
                </tr>
              </thead>
              <tbody>
                {provisiones.map((p) => (
                  <tr key={p.concepto}>
                    <Td>
                      <span className="font-medium">{p.concepto}</span>
                      <span className="block text-xs text-texto-3">{p.norma}</span>
                    </Td>
                    <Td numerico>{porcentaje(p.tarifa, 2)}</Td>
                    <Td numerico className="font-medium">
                      {pesos(p.valor)}
                    </Td>
                  </tr>
                ))}
                <tr className="bg-superficie-2">
                  <Td className="font-display font-semibold">Total</Td>
                  <Td numerico className="font-semibold">
                    {porcentaje(
                      provisiones.reduce((s, p) => s + p.tarifa, 0),
                      2,
                    )}
                  </Td>
                  <Td numerico className="font-semibold">
                    {pesos(totalProvisiones)}
                  </Td>
                </tr>
              </tbody>
            </Tabla>
          </Tarjeta>

          {[...aportes.avisos, ...devengado.avisos].map((a) => (
            <Llamado key={a} tono="info" icono={<Info size={18} />}>
              {a}
            </Llamado>
          ))}
        </div>
      </div>
    </div>
  );
}
