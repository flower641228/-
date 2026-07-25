import { useMemo } from "react";

export type Series = {
  label: string;
  color: string;
  values: number[];
};

type LineChartProps = {
  title: string;
  series: Series[];
  height?: number;
};

const chartPadding = 24;

const LineChart = ({ title, series, height = 180 }: LineChartProps) => {
  const width = 640;
  const maxLength = Math.max(1, ...series.map((item) => item.values.length));
  const { minValue, maxValue } = useMemo(() => {
    const all = series.flatMap((item) => item.values);
    const min = Math.min(...all, 0);
    const max = Math.max(...all, 1);
    return { minValue: min, maxValue: max };
  }, [series]);

  const yScale = (value: number) => {
    if (maxValue === minValue) {
      return height / 2;
    }
    const ratio = (value - minValue) / (maxValue - minValue);
    return height - chartPadding - ratio * (height - chartPadding * 2);
  };

  const xScale = (index: number) => {
    if (maxLength <= 1) {
      return chartPadding;
    }
    return (
      chartPadding +
      (index / (maxLength - 1)) * (width - chartPadding * 2)
    );
  };

  const paths = useMemo(
    () =>
      series.map((item) => {
        const path = item.values
          .map((value, index) => {
            const x = xScale(index);
            const y = yScale(value);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");
        return { ...item, path };
      }),
    [series, maxLength, minValue, maxValue]
  );

  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        <rect
          x={chartPadding}
          y={chartPadding}
          width={width - chartPadding * 2}
          height={height - chartPadding * 2}
          className="chart-frame"
        />
        {paths.map((item) => (
          <path
            key={item.label}
            d={item.path}
            stroke={item.color}
            strokeWidth={2}
            fill="none"
          />
        ))}
      </svg>
      <div className="chart-legend">
        {series.map((item) => (
          <div key={item.label} className="legend-item">
            <span className="legend-dot" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
      <div className="chart-range">
        <span>min: {minValue.toFixed(3)}</span>
        <span>max: {maxValue.toFixed(3)}</span>
      </div>
    </div>
  );
};

export default LineChart;
