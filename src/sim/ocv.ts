const SOC_LUT = [0, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0];
const OCV_LUT = [3.0, 3.25, 3.4, 3.55, 3.7, 3.9, 4.05, 4.2];

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const ocvFromSoc = (soc: number) => {
  const clamped = clamp(soc, 0, 1);
  for (let i = 0; i < SOC_LUT.length - 1; i += 1) {
    const s0 = SOC_LUT[i];
    const s1 = SOC_LUT[i + 1];
    if (clamped >= s0 && clamped <= s1) {
      const t = (clamped - s0) / (s1 - s0);
      return OCV_LUT[i] + t * (OCV_LUT[i + 1] - OCV_LUT[i]);
    }
  }
  return OCV_LUT[OCV_LUT.length - 1];
};

export const docvDsoc = (soc: number) => {
  const clamped = clamp(soc, 0, 1);
  for (let i = 0; i < SOC_LUT.length - 1; i += 1) {
    const s0 = SOC_LUT[i];
    const s1 = SOC_LUT[i + 1];
    if (clamped >= s0 && clamped <= s1) {
      return (OCV_LUT[i + 1] - OCV_LUT[i]) / (s1 - s0);
    }
  }
  return 0;
};
