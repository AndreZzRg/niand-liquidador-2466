import { useState, type JSX } from 'react';

import { Shell, type ModuloId } from './brand/Shell';
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
  const [modulo, setModulo] = useState<ModuloId>('devengado-y-recargos');
  const Panel = PANELES[modulo];

  return (
    <Shell moduloActivo={modulo} onModulo={setModulo}>
      <Panel />
    </Shell>
  );
}
