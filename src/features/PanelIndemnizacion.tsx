/**
 * Módulo «Indemnización»: calculadora aislada del art. 64 del CST, con la
 * tabla de referencia y el efecto del umbral de 10 SMMLV.
 */
import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';

import { Campo, Dato, Entrada, Llamado, Seleccion, Tabla, Tarjeta, Td, Th } from '../brand/ui';
import { indemnizacion } from '../domain/prestaciones';
import type { TipoContrato } from '../domain/prestaciones';
import { UMBRAL_INDEMNIZACION_SMMLV } from '../domain/parametros';
import { numero, pesos, plural } from '../lib/formato';
import { useEstado } from '../store';
import { BarraConfiguracion, useParametrosEfectivos } from './Configuracion';

const ESCENARIOS = [180, 360, 540, 720, 1080, 1800, 3600];

export function PanelIndemnizacion() {
  const { config, nomina } = useEstado();
  const { anio, smmlv } = useParametrosEfectivos();
  const [tipoContrato, setTipoContrato] = useState<TipoContrato>('indefinido');
  const [diasServicio, setDiasServicio] = useState(720);
  const [diasFaltantes, setDiasFaltantes] = useState(90);
  const [salario, setSalario] = useState(nomina.salarioMensual);

  const manual = { smmlv: config.smmlvManual, auxilioTransporte: config.auxilioManual };

  const resultado = useMemo(
    () =>
      indemnizacion({
        tipoContrato,
        salarioBase: salario,
        diasServicio,
        diasFaltantes,
        anio,
        parametros: manual,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tipoContrato, salario, diasServicio, diasFaltantes, anio, config],
  );

  const enSmmlv = salario / smmlv;

  return (
    <div className="space-y-6">
      <BarraConfiguracion />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Tarjeta titulo="Supuesto" descripcion="CST art. 64, modificado por la Ley 789 de 2002.">
          <div className="space-y-4">
            <Campo etiqueta="Tipo de contrato">
              {(id) => (
                <Seleccion
                  id={id}
                  value={tipoContrato}
                  onChange={(e) => setTipoContrato(e.target.value as TipoContrato)}
                >
                  <option value="indefinido">Término indefinido</option>
                  <option value="fijo">Término fijo</option>
                  <option value="obraLabor">Obra o labor</option>
                </Seleccion>
              )}
            </Campo>

            <Campo etiqueta="Salario mensual" requerido>
              {(id) => (
                <Entrada
                  id={id}
                  type="number"
                  min={0}
                  step={1000}
                  value={salario}
                  onChange={(e) => setSalario(Number(e.target.value))}
                />
              )}
            </Campo>

            {tipoContrato === 'indefinido' ? (
              <Campo etiqueta="Días de servicio (base 360)" ayuda="360 días equivalen a un año.">
                {(id) => (
                  <Entrada
                    id={id}
                    type="number"
                    min={0}
                    value={diasServicio}
                    onChange={(e) => setDiasServicio(Number(e.target.value))}
                  />
                )}
              </Campo>
            ) : (
              <Campo etiqueta="Días faltantes del plazo" ayuda="Mínimo legal: 15 días.">
                {(id) => (
                  <Entrada
                    id={id}
                    type="number"
                    min={0}
                    value={diasFaltantes}
                    onChange={(e) => setDiasFaltantes(Number(e.target.value))}
                  />
                )}
              </Campo>
            )}
          </div>

          <Llamado tono="marca" className="mt-5" icono={<Scale size={18} />}>
            El salario equivale a <strong>{numero(enSmmlv)} SMMLV</strong>.{' '}
            {enSmmlv >= UMBRAL_INDEMNIZACION_SMMLV
              ? 'Desde 10 SMMLV aplica la tabla reducida: 20 días el primer año y 15 por cada año adicional.'
              : 'Por debajo de 10 SMMLV aplica la tabla plena: 30 días el primer año y 20 por cada año adicional.'}
          </Llamado>
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo="Indemnización" descripcion={resultado.regla}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Dato
                rotulo="Días indemnizados"
                valor={numero(resultado.diasIndemnizados)}
                tono="marca"
              />
              <Dato rotulo="Valor del día" valor={pesos(resultado.valorDia)} />
              <Dato rotulo="Total" valor={pesos(resultado.valor)} tono="riesgo" />
            </div>

            <ul className="mt-5 space-y-1.5 text-sm text-texto-2">
              {resultado.detalle.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-marca">·</span>
                  {d}
                </li>
              ))}
            </ul>

            <p className="mt-4 border-t border-borde pt-3 text-xs text-texto-3">
              {resultado.norma}
            </p>
          </Tarjeta>

          {tipoContrato === 'indefinido' && (
            <Tarjeta
              titulo="Escala por tiempo de servicio"
              descripcion={`Con un salario de ${pesos(salario)}`}
            >
              <Tabla>
                <thead>
                  <tr>
                    <Th>Tiempo de servicio</Th>
                    <Th numerico>Días</Th>
                    <Th numerico>Indemnización</Th>
                  </tr>
                </thead>
                <tbody>
                  {ESCENARIOS.map((d) => {
                    const i = indemnizacion({
                      tipoContrato: 'indefinido',
                      salarioBase: salario,
                      diasServicio: d,
                      diasFaltantes: 0,
                      anio,
                      parametros: manual,
                    });
                    return (
                      <tr key={d} className={d === diasServicio ? 'bg-superficie-2' : undefined}>
                        <Td>{plural(d / 360, 'año', 'años')}</Td>
                        <Td numerico>{numero(i.diasIndemnizados)}</Td>
                        <Td numerico className="font-medium">
                          {pesos(i.valor)}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tabla>
            </Tarjeta>
          )}

          <Llamado tono="alerta" titulo="Lo que esta cifra no incluye">
            La indemnización del art. 64 no cubre la <strong>indemnización moratoria</strong> del
            art. 65 del CST por el pago tardío de la liquidación, ni el reintegro que puede ordenar
            un juez cuando el trabajador está amparado por una estabilidad laboral reforzada —fuero
            de maternidad, fuero sindical, fuero de salud o prepensionado—. En esos casos el despido
            requiere autorización previa y la indemnización no lo convalida.
          </Llamado>
        </div>
      </div>
    </div>
  );
}
