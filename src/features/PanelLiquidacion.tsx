/**
 * Módulo «Liquidación definitiva»: prestaciones sociales causadas y, cuando
 * procede, indemnización del art. 64 del CST.
 */
import { useMemo } from 'react';
import { Download, Info, Printer } from 'lucide-react';

import {
  Boton,
  Campo,
  Dato,
  Entrada,
  Llamado,
  Seleccion,
  Tabla,
  Tarjeta,
  Td,
  Th,
} from '../brand/ui';
import { liquidar } from '../domain/prestaciones';
import { tieneAuxilioTransporte } from '../domain/recargos';
import type { CausaTerminacion, TipoContrato } from '../domain/prestaciones';
import { exportarCSV, imprimir } from '../lib/exportar';
import { fechaLarga, numero, pesos, plural } from '../lib/formato';
import { useEstado } from '../store';
import { BarraConfiguracion, useParametrosEfectivos } from './Configuracion';

const CAUSAS: ReadonlyArray<[CausaTerminacion, string]> = [
  ['sinJustaCausa', 'Despido sin justa causa'],
  ['justaCausa', 'Despido con justa causa'],
  ['renuncia', 'Renuncia voluntaria'],
  ['mutuoAcuerdo', 'Mutuo acuerdo'],
  ['vencimientoPlazo', 'Vencimiento del plazo pactado'],
];

const CONTRATOS: ReadonlyArray<[TipoContrato, string]> = [
  ['indefinido', 'Término indefinido'],
  ['fijo', 'Término fijo'],
  ['obraLabor', 'Obra o labor'],
];

export function PanelLiquidacion() {
  const { contrato, nomina, config, setContrato } = useEstado();
  const { auxilioTransporte, anio } = useParametrosEfectivos();

  const conDerechoAuxilio = tieneAuxilioTransporte(nomina.salarioMensual, anio, {
    smmlv: config.smmlvManual,
    auxilioTransporte: config.auxilioManual,
  });

  const resultado = useMemo(() => {
    try {
      return {
        ok: true as const,
        datos: liquidar({
          ingreso: contrato.ingreso,
          retiro: contrato.retiro,
          salarioBase: nomina.salarioMensual,
          // El auxilio solo entra a la base prestacional si hay derecho a él.
          auxilioTransporte: conDerechoAuxilio ? auxilioTransporte : 0,
          tipoContrato: contrato.tipoContrato,
          causa: contrato.causa,
          diasFaltantes: contrato.diasFaltantes,
          vacacionesTomadas: contrato.vacacionesTomadas,
          parametros: { smmlv: config.smmlvManual, auxilioTransporte: config.auxilioManual },
        }),
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [contrato, nomina.salarioMensual, auxilioTransporte, conDerechoAuxilio, config]);

  const descargar = () => {
    if (!resultado.ok) return;
    const l = resultado.datos;
    exportarCSV(
      [
        ['Liquidación definitiva de contrato'],
        ['Ingreso', contrato.ingreso, 'Retiro', contrato.retiro],
        ['Días de servicio (base 360)', l.diasServicio],
        [],
        ['Concepto', 'Norma', 'Base', 'Días', 'Fórmula', 'Valor'],
        ...l.prestaciones.map((p) => [
          p.concepto,
          p.norma,
          Math.round(p.base),
          p.dias,
          p.formula,
          Math.round(p.valor),
        ]),
        ...(l.indemnizacion
          ? [
              [
                'Indemnización',
                l.indemnizacion.norma,
                Math.round(l.indemnizacion.valorDia),
                Number(l.indemnizacion.diasIndemnizados.toFixed(2)),
                l.indemnizacion.regla,
                Math.round(l.indemnizacion.valor),
              ],
            ]
          : []),
        [],
        ['TOTAL', '', '', '', '', Math.round(l.total)],
      ],
      'liquidacion',
    );
  };

  return (
    <div className="space-y-6">
      <BarraConfiguracion />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Tarjeta titulo="Datos del contrato">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Fecha de ingreso" requerido>
              {(id) => (
                <Entrada
                  id={id}
                  type="date"
                  value={contrato.ingreso}
                  onChange={(e) => setContrato({ ingreso: e.target.value })}
                />
              )}
            </Campo>
            <Campo etiqueta="Fecha de retiro" requerido ayuda="Se cuenta como día trabajado.">
              {(id) => (
                <Entrada
                  id={id}
                  type="date"
                  value={contrato.retiro}
                  onChange={(e) => setContrato({ retiro: e.target.value })}
                />
              )}
            </Campo>
            <Campo etiqueta="Tipo de contrato">
              {(id) => (
                <Seleccion
                  id={id}
                  value={contrato.tipoContrato}
                  onChange={(e) => setContrato({ tipoContrato: e.target.value as TipoContrato })}
                >
                  {CONTRATOS.map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </Seleccion>
              )}
            </Campo>
            <Campo etiqueta="Causa de terminación">
              {(id) => (
                <Seleccion
                  id={id}
                  value={contrato.causa}
                  onChange={(e) => setContrato({ causa: e.target.value as CausaTerminacion })}
                >
                  {CAUSAS.map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </Seleccion>
              )}
            </Campo>
            {contrato.tipoContrato !== 'indefinido' && (
              <Campo
                etiqueta="Días faltantes del plazo"
                ayuda="Se indemnizan con un mínimo de 15 días."
              >
                {(id) => (
                  <Entrada
                    id={id}
                    type="number"
                    min={0}
                    value={contrato.diasFaltantes}
                    onChange={(e) => setContrato({ diasFaltantes: Number(e.target.value) })}
                  />
                )}
              </Campo>
            )}
            <Campo etiqueta="Vacaciones disfrutadas (días)" ayuda="Días hábiles ya tomados.">
              {(id) => (
                <Entrada
                  id={id}
                  type="number"
                  min={0}
                  value={contrato.vacacionesTomadas}
                  onChange={(e) => setContrato({ vacacionesTomadas: Number(e.target.value) })}
                />
              )}
            </Campo>
          </div>

          <p className="mt-4 text-xs text-texto-3">
            El salario base y el auxilio de transporte se toman de la configuración y del módulo de
            devengado: {pesos(nomina.salarioMensual)} más{' '}
            {conDerechoAuxilio ? pesos(auxilioTransporte) : 'cero, por superar 2 SMMLV'}.
          </p>
        </Tarjeta>

        <div className="space-y-6">
          {!resultado.ok ? (
            <Llamado tono="riesgo" titulo="No se puede liquidar" icono={<Info size={18} />}>
              {resultado.error}
            </Llamado>
          ) : (
            <>
              <Tarjeta
                titulo="Liquidación"
                descripcion={`Del ${fechaLarga(contrato.ingreso)} al ${fechaLarga(contrato.retiro)} · ${plural(resultado.datos.diasServicio, 'día', 'días')} en base 360`}
                acciones={
                  <>
                    <Boton variante="secundario" tamano="sm" onClick={descargar}>
                      <Download size={14} /> CSV
                    </Boton>
                    <Boton variante="fantasma" tamano="sm" onClick={imprimir}>
                      <Printer size={14} />
                    </Boton>
                  </>
                }
              >
                <Tabla>
                  <thead>
                    <tr>
                      <Th>Concepto</Th>
                      <Th numerico>Días</Th>
                      <Th numerico>Valor</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.datos.prestaciones.map((p) => (
                      <tr key={p.concepto}>
                        <Td>
                          <span className="font-medium">{p.concepto}</span>
                          <span className="block text-xs text-texto-3">
                            {p.norma} · {p.formula}
                          </span>
                        </Td>
                        <Td numerico>{numero(p.dias, 0)}</Td>
                        <Td numerico className="font-medium">
                          {pesos(p.valor)}
                        </Td>
                      </tr>
                    ))}
                    {resultado.datos.indemnizacion && (
                      <tr>
                        <Td>
                          <span className="font-medium">Indemnización</span>
                          <span className="block text-xs text-texto-3">
                            {resultado.datos.indemnizacion.norma}
                          </span>
                        </Td>
                        <Td numerico>{numero(resultado.datos.indemnizacion.diasIndemnizados)}</Td>
                        <Td numerico className="font-medium">
                          {pesos(resultado.datos.indemnizacion.valor)}
                        </Td>
                      </tr>
                    )}
                    <tr className="bg-superficie-2">
                      <Td className="font-display font-semibold">Total a pagar</Td>
                      <Td />
                      <Td numerico className="font-display text-base font-semibold text-marca">
                        {pesos(resultado.datos.total)}
                      </Td>
                    </tr>
                  </tbody>
                </Tabla>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Dato
                    rotulo="Prestaciones sociales"
                    valor={pesos(resultado.datos.totalPrestaciones)}
                  />
                  <Dato
                    rotulo="Indemnización"
                    valor={pesos(resultado.datos.indemnizacion?.valor ?? 0)}
                    tono={resultado.datos.indemnizacion ? 'riesgo' : 'neutro'}
                    detalle={resultado.datos.indemnizacion ? undefined : 'No procede'}
                  />
                </div>
              </Tarjeta>

              {resultado.datos.indemnizacion && (
                <Tarjeta titulo="Cómo se calculó la indemnización">
                  <p className="text-sm font-medium">{resultado.datos.indemnizacion.regla}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-texto-2">
                    {resultado.datos.indemnizacion.detalle.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span className="text-marca">·</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </Tarjeta>
              )}

              {resultado.datos.avisos.map((a) => (
                <Llamado key={a} tono="info" icono={<Info size={18} />}>
                  {a}
                </Llamado>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
