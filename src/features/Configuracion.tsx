/**
 * Barra de configuración común a todos los módulos. Los parámetros que aquí
 * se fijan determinan el resultado de cada cálculo, así que están siempre a
 * la vista en lugar de escondidos en un menú.
 */
import { CircleAlert, RotateCcw } from 'lucide-react';

import { Boton, Campo, Entrada, Insignia, Llamado, Seleccion, Tarjeta } from '../brand/ui';
import { CLASES_ARL, finJornadaDiurna, parametrosDe, recargoDominical } from '../domain/parametros';
import { pesos, porcentaje } from '../lib/formato';
import { useEstado } from '../store';

export function useParametrosEfectivos() {
  const config = useEstado((s) => s.config);
  const anio = Number(config.fecha.slice(0, 4));
  const base = parametrosDe(anio);
  return {
    anio,
    base,
    smmlv: config.smmlvManual ?? base.smmlv,
    auxilioTransporte: config.auxilioManual ?? base.auxilioTransporte,
    ajustado: config.smmlvManual !== null || config.auxilioManual !== null,
  };
}

export function BarraConfiguracion() {
  const { config, setConfig, reiniciar } = useEstado();
  const { anio, base, smmlv, auxilioTransporte, ajustado } = useParametrosEfectivos();

  return (
    <div className="space-y-4">
      {!base.verificado && !ajustado && (
        <Llamado
          tono="alerta"
          titulo={`Los parámetros de ${anio} no están confirmados`}
          icono={<CircleAlert size={18} />}
        >
          <p>
            {base.fuente} Mientras tanto se usan los valores de {base.anio}:{' '}
            <strong>{pesos(base.smmlv)}</strong> de salario mínimo y{' '}
            <strong>{pesos(base.auxilioTransporte)}</strong> de auxilio de transporte. Edítelos
            abajo antes de usar el resultado en una decisión real.
          </p>
        </Llamado>
      )}

      <Tarjeta
        titulo="Parámetros del cálculo"
        descripcion="La fecha determina el régimen de jornada y el recargo dominical aplicables."
        acciones={
          <Boton variante="fantasma" tamano="sm" onClick={reiniciar}>
            <RotateCcw size={14} /> Reiniciar
          </Boton>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Fecha de causación" ayuda="Fecha del periodo o del retiro.">
            {(id) => (
              <Entrada
                id={id}
                type="date"
                value={config.fecha}
                onChange={(e) => setConfig({ fecha: e.target.value })}
              />
            )}
          </Campo>

          <Campo
            etiqueta="Salario mínimo del año"
            ayuda={base.verificado ? base.fuente : 'Sin confirmar: verifique el decreto.'}
          >
            {(id) => (
              <Entrada
                id={id}
                type="number"
                min={0}
                step={1000}
                value={smmlv}
                onChange={(e) =>
                  setConfig({ smmlvManual: e.target.value === '' ? null : Number(e.target.value) })
                }
              />
            )}
          </Campo>

          <Campo etiqueta="Auxilio de transporte" ayuda="Se debe hasta 2 salarios mínimos.">
            {(id) => (
              <Entrada
                id={id}
                type="number"
                min={0}
                step={1000}
                value={auxilioTransporte}
                onChange={(e) =>
                  setConfig({
                    auxilioManual: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            )}
          </Campo>

          <Campo
            etiqueta="Base de la hora ordinaria"
            ayuda="El divisor cambia el valor de todo recargo."
          >
            {(id) => (
              <Seleccion
                id={id}
                value={config.baseHoraria}
                onChange={(e) =>
                  setConfig({ baseHoraria: e.target.value as typeof config.baseHoraria })
                }
              >
                <option value="legal">240 horas al mes (divisor legal)</option>
                <option value="jornadaReal">Jornada real vigente (Ley 2101)</option>
              </Seleccion>
            )}
          </Campo>

          <Campo etiqueta="Clase de riesgo (ARL)" ayuda="Decreto 1772 de 1994, art. 13.">
            {(id) => (
              <Seleccion
                id={id}
                value={config.claseARL}
                onChange={(e) => setConfig({ claseARL: e.target.value as typeof config.claseARL })}
              >
                {CLASES_ARL.map((c) => (
                  <option key={c.clase} value={c.clase}>
                    Clase {c.clase} — {porcentaje(c.tarifa, 3)} · {c.ejemplo}
                  </option>
                ))}
              </Seleccion>
            )}
          </Campo>

          <div className="space-y-3 sm:col-span-2">
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--marca)]"
                checked={config.empleadorExonerable}
                onChange={(e) => setConfig({ empleadorExonerable: e.target.checked })}
              />
              <span>
                <strong>Empleador sujeto a la exoneración del art. 114-1 del E.T.</strong>
                <span className="block text-xs text-texto-3">
                  Exonera al empleador de salud, SENA e ICBF por los trabajadores que devenguen
                  menos de 10 salarios mínimos.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--marca)]"
                checked={config.salarioIntegral}
                onChange={(e) => setConfig({ salarioIntegral: e.target.checked })}
              />
              <span>
                <strong>Salario integral</strong>
                <span className="block text-xs text-texto-3">
                  La base de cotización corresponde al 70 % (CST, art. 132).
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-borde pt-4">
          <Insignia tono="marca">
            Jornada diurna hasta las {finJornadaDiurna(config.fecha)}:00
          </Insignia>
          <Insignia tono="info">
            Recargo dominical {porcentaje(recargoDominical(config.fecha))}
          </Insignia>
          <Insignia tono={base.verificado || ajustado ? 'ok' : 'alerta'}>
            {ajustado
              ? 'Parámetros ajustados a mano'
              : base.verificado
                ? 'Parámetros verificados'
                : 'Parámetros sin confirmar'}
          </Insignia>
        </div>
      </Tarjeta>
    </div>
  );
}
