import { useEffect, useMemo, useRef, useState } from "react";
import LineChart from "./components/LineChart";
import { ecmStep, initializeEcmState } from "./sim/ecm";
import { initializeEkfState, ekfPredict, ekfUpdate } from "./sim/ekf";
import { ocvFromSoc } from "./sim/ocv";
import type { EcmParams, EcmState, EkfState } from "./sim/types";

const params: EcmParams = {
  r0: 0.015,
  r1: 0.01,
  c1: 2400,
  capacityAh: 2.6,
};

const dt = 1;
const maxPoints = 240;

const App = () => {
  const [isRunning, setIsRunning] = useState(true);
  const [ekfEnabled, setEkfEnabled] = useState(true);
  const [time, setTime] = useState(0);
  const [current, setCurrent] = useState(0);
  const [vMeas, setVMeas] = useState<number[]>([]);
  const [vEcm, setVEcm] = useState<number[]>([]);
  const [vEkf, setVEkf] = useState<number[]>([]);
  const [socEcm, setSocEcm] = useState<number[]>([]);
  const [socEkf, setSocEkf] = useState<number[]>([]);
  const [residuals, setResiduals] = useState<number[]>([]);
  const trueState = useRef<EcmState>(initializeEcmState(0.85));
  const ecmState = useRef<EcmState>(initializeEcmState(0.8));
  const ekfState = useRef<EkfState>(initializeEkfState(0.75));

  const pushValue = (setter: (values: number[]) => void, value: number) => {
    setter((prev) => {
      const next = [...prev, value];
      if (next.length > maxPoints) {
        next.shift();
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      setTime((prev) => {
        const newTime = prev + dt;
        const excitation =
          1.5 * Math.sin(newTime / 12) + 0.6 * Math.sin(newTime / 4);
        const noise = (Math.random() - 0.5) * 0.2;
        const i = excitation + noise;
        setCurrent(i);

        const trueStep = ecmStep(trueState.current, i, dt, params);
        trueState.current = trueStep.state;
        const measured = trueStep.vTerminal + (Math.random() - 0.5) * 0.01;

        const ecmStepResult = ecmStep(ecmState.current, i, dt, params);
        ecmState.current = ecmStepResult.state;

        const ekfPrediction = ekfPredict(ekfState.current, i, dt, params);
        let updatedEkf = ekfPrediction.state;
        let residual = measured - ekfPrediction.vPred;
        if (ekfEnabled) {
          const ekfResult = ekfUpdate(ekfPrediction.state, i, measured, params);
          updatedEkf = ekfResult.state;
          residual = ekfResult.residual;
        }
        ekfState.current = updatedEkf;

        pushValue(setVMeas, measured);
        pushValue(setVEcm, ecmStepResult.vTerminal);
        pushValue(setVEkf, ekfPrediction.vPred);
        pushValue(setSocEcm, ecmStepResult.state.soc);
        pushValue(setSocEkf, updatedEkf.soc);
        pushValue(setResiduals, residual);

        return newTime;
      });
    }, 400);

    return () => window.clearInterval(interval);
  }, [isRunning, ekfEnabled]);

  const socTruth = useMemo(() => ocvFromSoc(trueState.current.soc), [vMeas]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>1RC ECM + EKF 학습용 시뮬레이터</h1>
          <p>
            ECM 단독(open-loop)과 EKF 보정(closed-loop)을 동시에 비교하며, 잔차
            기반 SOC 보정을 확인합니다.
          </p>
        </div>
        <div className="controls">
          <button type="button" onClick={() => setIsRunning((prev) => !prev)}>
            {isRunning ? "일시정지" : "재생"}
          </button>
          <label className="toggle">
            <input
              type="checkbox"
              checked={ekfEnabled}
              onChange={(event) => setEkfEnabled(event.target.checked)}
            />
            EKF ON
          </label>
        </div>
      </header>

      <section className="status-grid">
        <div className="status-card">
          <h3>실시간 입력</h3>
          <p>t = {time.toFixed(0)} s</p>
          <p>I = {current.toFixed(2)} A</p>
          <p>OCV(SOC_true) = {socTruth.toFixed(3)} V</p>
        </div>
        <div className="status-card">
          <h3>ECM(open-loop)</h3>
          <p>V_pred = {vEcm[vEcm.length - 1]?.toFixed(3) ?? "-"} V</p>
          <p>SOC = {(socEcm[socEcm.length - 1] ?? 0).toFixed(3)}</p>
        </div>
        <div className="status-card">
          <h3>EKF(closed-loop)</h3>
          <p>V_pred = {vEkf[vEkf.length - 1]?.toFixed(3) ?? "-"} V</p>
          <p>SOC = {(socEkf[socEkf.length - 1] ?? 0).toFixed(3)}</p>
          <p>Residual = {residuals[residuals.length - 1]?.toFixed(4) ?? "-"}</p>
        </div>
      </section>

      <section className="chart-grid">
        <LineChart
          title="Terminal Voltage Overlay"
          series={[
            { label: "V_meas", color: "#f97316", values: vMeas },
            { label: "V_ecm", color: "#2563eb", values: vEcm },
            { label: "V_ekf", color: "#10b981", values: vEkf },
          ]}
        />
        <LineChart
          title="SOC 비교"
          series={[
            { label: "SOC_ecm", color: "#6366f1", values: socEcm },
            { label: "SOC_ekf", color: "#ec4899", values: socEkf },
          ]}
          height={160}
        />
        <LineChart
          title="Residual (V_meas - V_pred)"
          series={[{ label: "residual", color: "#ef4444", values: residuals }]}
          height={160}
        />
      </section>
    </div>
  );
};

export default App;
