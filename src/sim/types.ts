export type EcmParams = {
  r0: number;
  r1: number;
  c1: number;
  capacityAh: number;
};

export type EcmState = {
  soc: number;
  v1: number;
};

export type EkfState = {
  soc: number;
  v1: number;
  p: [[number, number], [number, number]];
};
