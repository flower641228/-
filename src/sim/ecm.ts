import { clamp, ocvFromSoc } from "./ocv";
import type { EcmParams, EcmState } from "./types";

export const initializeEcmState = (soc = 0.8): EcmState => ({
  soc,
  v1: 0,
});

export const ecmStep = (
  state: EcmState,
  current: number,
  dt: number,
  params: EcmParams
) => {
  const { r1, c1, capacityAh, r0 } = params;
  const tau1 = r1 * c1;
  const a1 = Math.exp(-dt / tau1);
  const v1 = a1 * state.v1 + (1 - a1) * r1 * current;
  const soc = clamp(state.soc - (current * dt) / (capacityAh * 3600), 0, 1);
  const vTerminal = ocvFromSoc(soc) - v1 - current * r0;

  return {
    state: { soc, v1 },
    vTerminal,
  };
};
