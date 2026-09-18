/**
 * Módulo «Devengado y recargos»: liquida el pago de un periodo con sus
 * recargos, y ofrece un clasificador de turnos que muestra el efecto concreto
 * de la Ley 2466 sobre la frontera de la jornada nocturna.
 */
import { useMemo, useState } from 'react';
import { Clock, Download, Info } from 'lucide-react';

import {
  Boton,
  Campo,
  Dato,
  Entrada,
  Insignia,
  Llamado,
  Tabla,
  Tarjeta,
  Td,
  Th,
} from '../brand/ui';
import { CONCEPTOS, calcularDevengado, repartirJornada } from '../domain/recargos';
import { horasReclasificadasPor2466 } from '../domain/recargos';
import { exportarCSV } from '../lib/exportar';
import { horas as fmtHoras, numero, pesos, pesosExactos, porcentaje } from '../lib/formato';
import { useEstado } from '../store';
import { BarraConfiguracion } from './Configuracion';

export function PanelDevengado() {
  const { config, nomina, setNomina, setHoras } = useEstado();

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
        parametros: { smmlv: config.smmlvManual, auxilioTransporte: config.auxilioManual },
      }),
    [nomina, config],
  );

  const descargar = () => {
    exportarCSV(
      [
        ['Concepto', 'Norma', 'Horas', 'Factor', 'Valor hora', 'Total'],
        ...devengado.lineas.map((l) => [
          l.concepto.nombre,
          l.concepto.norma,
          l.horas,
          l.factor,
          Math.round(l.valorHora),
          Math.round(l.total),
        ]),
        [],
        ['Sueldo proporcional', '', '', '', '', Math.round(devengado.sueldoProporcional)],
        ['Auxilio de transporte', '', '', '', '', Math.round(devengado.auxilioTransporte)],
        ['Total recargos', '', '', '', '', Math.round(devengado.totalRecargos)],
        ['Total devengado', '', '', '', '', Math.round(devengado.totalDevengado)],
      ],
      'devengado',
    );
  };

  return (
    <div className="space-y-6">
      <BarraConfiguracion />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Tarjeta titulo="Datos del periodo">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Salario básico mensual" requerido>
              {(id) => (
                <Entrada
                  id={id}
                  type="number"
                  min={0}
                  step={1000}
                  value={nomina.salarioMensual}
                  onChange={(e) => setNomina({ salarioMensual: Number(e.target.value) })}
                />
              )}
            </Campo>
            <Campo etiqueta="Días laborados" ayuda="El mes laboral se cuenta de 30 días.">
              {(id) => (
                <Entrada
                  id={id}
                  type="number"
                  min={0}
                  max={30}
                  value={nomina.diasLaborados}
                  onChange={(e) => setNomina({ diasLaborados: Number(e.target.value) })}
                />
              )}
            </Campo>
            <Campo
              etiqueta="Otros pagos salariales"
              ayuda="Comisiones y bonificaciones habituales."
            >
              {(id) => (
                <Entrada
                  id={id}
                  type="number"
                  min={0}
                  step={1000}
                  value={nomina.otrosSalariales}
                  onChange={(e) => setNomina({ otrosSalariales: Number(e.target.value) })}
                />
              )}
            </Campo>
            <Campo etiqueta="Pagos no salariales" ayuda="CST art. 128. Tope del 40 % para el IBC.">
              {(id) => (
                <Entrada
                  id={id}
                  type="number"
                  min={0}
                  step={1000}
                  value={nomina.noSalariales}
                  onChange={(e) => setNomina({ noSalariales: Number(e.target.value) })}
                />
              )}
            </Campo>
          </div>

          <h3 className="mt-6 mb-3 font-display text-sm font-semibold">Horas por concepto</h3>
          <div className="space-y-2">
            {CONCEPTOS.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-borde bg-superficie-3 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.nombre}</p>
                  <p className="eyebrow truncate">
                    {c.sigla} · {c.norma} · {porcentaje(c.factor(config.fecha))}
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  aria-label={`Horas de ${c.nombre}`}
                  value={nomina.horas[c.id] ?? 0}
                  onChange={(e) => setHoras({ [c.id]: Number(e.target.value) })}
                  className="w-20 shrink-0 rounded-lg border border-borde bg-superficie px-2 py-1.5 text-right text-sm"
                />
              </div>
            ))}
          </div>
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta
            titulo="Resultado del periodo"
            descripcion={`Hora ordinaria: ${pesosExactos(devengado.valorHoraOrdinaria)}`}
            acciones={
              <Boton variante="secundario" tamano="sm" onClick={descargar}>
                <Download size={14} /> CSV
              </Boton>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Dato rotulo="Sueldo del periodo" valor={pesos(devengado.sueldoProporcional)} />
              <Dato
                rotulo="Auxilio de transporte"
                valor={pesos(devengado.auxilioTransporte)}
                detalle={
                  devengado.auxilioTransporte === 0 ? 'Sin derecho: supera 2 SMMLV' : undefined
                }
              />
              <Dato rotulo="Recargos" valor={pesos(devengado.totalRecargos)} tono="marca" />
              <Dato
                rotulo="Total devengado"
                valor={pesos(devengado.totalDevengado)}
                tono="ok"
                detalle="Antes de deducciones de seguridad social"
              />
            </div>

            {devengado.lineas.length > 0 && (
              <div className="mt-5">
                <Tabla>
                  <thead>
                    <tr>
                      <Th>Concepto</Th>
                      <Th numerico>Horas</Th>
                      <Th numerico>Factor</Th>
                      <Th numerico>Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {devengado.lineas.map((l) => (
                      <tr key={l.concepto.id}>
                        <Td>
                          <span className="font-medium">{l.concepto.sigla}</span>
                          <span className="block text-xs text-texto-3">{l.concepto.norma}</span>
                        </Td>
                        <Td numerico>{numero(l.horas)}</Td>
                        <Td numerico>{porcentaje(l.factor)}</Td>
                        <Td numerico className="font-medium">
                          {pesos(l.total)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              </div>
            )}
          </Tarjeta>

          {devengado.avisos.map((a) => (
            <Llamado key={a} tono="alerta" icono={<Info size={18} />}>
              {a}
            </Llamado>
          ))}

          <ClasificadorTurno fecha={config.fecha} />
        </div>
      </div>
    </div>
  );
}

/** Muestra, sobre un turno concreto, cuántas horas cambió de franja la reforma. */
function ClasificadorTurno({ fecha }: { fecha: string }) {
  const [inicio, setInicio] = useState(14);
  const [duracion, setDuracion] = useState(8);

  const turno = { inicio, duracion };
  const actual = repartirJornada(turno, fecha);
  const anterior = repartirJornada(turno, '2025-01-01');
  const cambio = horasReclasificadasPor2466(turno);

  const fin = (inicio + duracion) % 24;
  const hhmm = (h: number) => {
    const entero = Math.floor(h);
    const min = Math.round((h - entero) * 60);
    return `${String(entero).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  return (
    <Tarjeta
      titulo="Clasificador de turno"
      descripcion="Cuántas horas de un turno pasaron a ser nocturnas por la Ley 2466."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Hora de inicio">
          {(id) => (
            <Entrada
              id={id}
              type="number"
              min={0}
              max={23.5}
              step={0.5}
              value={inicio}
              onChange={(e) => setInicio(Number(e.target.value))}
            />
          )}
        </Campo>
        <Campo etiqueta="Duración (horas)">
          {(id) => (
            <Entrada
              id={id}
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
            />
          )}
        </Campo>
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-texto-2">
        <Clock size={15} className="text-marca" />
        Turno de {hhmm(inicio)} a {hhmm(fin)}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Dato
          rotulo="Régimen anterior (hasta 9:00 p. m.)"
          valor={fmtHoras(anterior.nocturnas)}
          detalle={`${fmtHoras(anterior.diurnas)} diurnas`}
        />
        <Dato
          rotulo="Régimen vigente (hasta 7:00 p. m.)"
          valor={fmtHoras(actual.nocturnas)}
          detalle={`${fmtHoras(actual.diurnas)} diurnas`}
          tono={cambio > 0 ? 'alerta' : 'neutro'}
        />
      </div>

      <div className="mt-4">
        {cambio > 0 ? (
          <Insignia tono="alerta">
            +{numero(cambio)} h nocturnas · recargo del 35 % adicional
          </Insignia>
        ) : (
          <Insignia tono="ok">Sin cambio por la reforma</Insignia>
        )}
      </div>
    </Tarjeta>
  );
}
