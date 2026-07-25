import { clamp, docvDsoc, ocvFromSoc } from "./ocv";
import type { EcmParams, EkfState } from "./types";

const matMul2 = (a: number[][], b: number[][]) => [
  [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
  [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
];

const matAdd2 = (a: number[][], b: number[][]) => [
  [a[0][0] + b[0][0], a[0][1] + b[0][1]],
  [a[1][0] + b[1][0], a[1][1] + b[1][1]],
];

const matSub2 = (a: number[][], b: number[][]) => [
  [a[0][0] - b[0][0], a[0][1] - b[0][1]],
  [a[1][0] - b[1][0], a[1][1] - b[1][1]],
];

export const initializeEkfState = (soc = 0.8): EkfState => ({
  soc,
  v1: 0,
  p: [
    [1e-3, 0],
    [0, 1e-3],
  ],
});

export const ekfPredict = (
  state: EkfState,
  current: number,
  dt: number,
  params: EcmParams,
  processNoise = [1e-6, 1e-5]
) => {
  const { r1, c1, capacityAh } = params;
  const tau1 = r1 * c1;
  const a1 = Math.exp(-dt / tau1);
  const soc = clamp(state.soc - (current * dt) / (capacityAh * 3600), 0, 1);
  const v1 = a1 * state.v1 + (1 - a1) * r1 * current;

  const f = [
    [1, 0],
    [0, a1],
  ];

  const q = [
    [processNoise[0], 0],
    [0, processNoise[1]],
  ];

  const pPred = matAdd2(matMul2(matMul2(f, state.p), [
    [f[0][0], f[1][0]],
    [f[0][1], f[1][1]],
  ]), q);

  return {
    state: { soc, v1, p: pPred },
    vPred: ocvFromSoc(soc) - v1 - current * params.r0,
  };
};

export const ekfUpdate = (
  state: EkfState,
  current: number,
  vMeas: number,
  params: EcmParams,
  measurementNoise = 2e-3
) => {
  const dh = [docvDsoc(state.soc), -1];
  const h = ocvFromSoc(state.soc) - state.v1 - current * params.r0;
  const residual = vMeas - h;
  const s =
    dh[0] * (dh[0] * state.p[0][0] + dh[1] * state.p[1][0]) +
    dh[1] * (dh[0] * state.p[0][1] + dh[1] * state.p[1][1]) +
    measurementNoise;
  const k0 = (state.p[0][0] * dh[0] + state.p[0][1] * dh[1]) / s;
  const k1 = (state.p[1][0] * dh[0] + state.p[1][1] * dh[1]) / s;

  const soc = clamp(state.soc + k0 * residual, 0, 1);
  const v1 = state.v1 + k1 * residual;

  const i = [
    [1, 0],
    [0, 1],
  ];
  const kh = [
    [k0 * dh[0], k0 * dh[1]],
    [k1 * dh[0], k1 * dh[1]],
  ];
  const p = matMul2(matSub2(i, kh), state.p);

  return {
    state: { soc, v1, p },
    residual,
  };
};
