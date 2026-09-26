import { useState, type JSX } from 'react';

import { Portada } from './brand/Portada';
import { APP, MODULOS, Shell, type ModuloId, type Vista } from './brand/Shell';
import { PanelAportes } from './features/PanelAportes';
import { PanelComparador } from './features/PanelComparador';
import { PanelDevengado } from './features/PanelDevengado';
import { PanelIndemnizacion } from './features/PanelIndemnizacion';
import { PanelLiquidacion } from './features/PanelLiquidacion';

const PANELES: Record<ModuloId, () => JSX.Element> = {
  'devengado-y-recargos': PanelDevengado,
  'liquidacion-definitiva': PanelLiquidacion,
  'seguridad-social-y-parafiscales': PanelAportes,
  indemnizacion: PanelIndemnizacion,
  'comparador-2025-2026-2027': PanelComparador,
};

export default function App() {
  // Se abre en la portada: quien llega ve primero de qué se compone la
  // herramienta, en vez de caer dentro del primer módulo sin contexto.
  const [vista, setVista] = useState<Vista>('portada');
  const Panel = vista === 'portada' ? null : PANELES[vista];

  return (
    <Shell vista={vista} onVista={setVista}>
      {Panel ? (
        <Panel />
      ) : (
        <Portada
          titulo={APP.nombre}
          descripcion={APP.resumen}
          modulos={MODULOS}
          onAbrir={(id) => setVista(id as ModuloId)}
        />
      )}
    </Shell>
  );
}
