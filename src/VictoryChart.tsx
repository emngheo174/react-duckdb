// VictoryChartComponent.tsx
import React, { useRef, useEffect, useState } from "react";
import { VictoryChart, VictoryHistogram, VictoryAxis } from "victory";

// Define the type for the component's props
interface VictoryChartComponentProps {
  data: string[]; // Input data as an array of strings
  bins?: number; // Number of bins (optional, will be auto-calculated if not provided)
  style?: { data: { fill: string; stroke: string; strokeWidth: number; width?: number } }; // Custom styles (optional)
  heightChart?: number;
}

const VictoryChartComponent: React.FC<VictoryChartComponentProps> = ({
  data,
  bins,
  style,
  heightChart
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number | undefined>(undefined);

  // Get the width of the parent container to calculate barWidth
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setChartWidth(entries[0].contentRect.width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  // Check the input data
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div
        style={{
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
        }}
      >
        No Data
      </div>
    );
  }

  // Convert strings to numbers and filter out invalid values
  const validData = data
    .map((value) => parseFloat(value)) // Convert string to number
    .filter((value) => !isNaN(value)); // Remove NaN (invalid values)

  if (validData.length === 0) {
    return (
      <div
        style={{
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
        }}
      >
        No Valid Data
      </div>
    );
  }

  // Automatically calculate the number of bins using the Rice Rule
  const calculatedBins = bins || Math.ceil(2 * Math.pow(validData.length, 1 / 3));
  // Limit the number of bins to fit the chart's size
  const validBins = Math.min(Math.max(calculatedBins, 5), 15); // Range: 5 <= bins <= 15

  // Format data for VictoryHistogram
  const formattedData = validData.map((value) => ({ x: value }));

  // Calculate the maximum frequency to limit the y-axis
  const binCounts = Array(validBins).fill(0);
  const binWidth = (Math.max(...validData) - Math.min(...validData)) / validBins;
  const minValue = Math.min(...validData);
  formattedData.forEach(({ x }) => {
    const binIndex = Math.min(
      Math.floor((x - minValue) / binWidth),
      validBins - 1
    );
    binCounts[binIndex]++;
  });
  const maxFrequency = Math.max(...binCounts);

  // Calculate barWidth based on chart width and number of bins
  const barWidth = chartWidth
    ? Math.max(5, chartWidth / validBins / (validBins <= 5 ? 1.5 : 2)) // Increase bar width when the number of bins is small
    : 5;

  return (
    <div ref={containerRef}>
      <VictoryChart
        padding={0}
        domainPadding={0} // Keep domainPadding small to make bars close to each other
        domain={{ y: [0, maxFrequency * 0.5] }} // Limit the y-axis to reduce bar height
        width={chartWidth} // Use width from ResizeObserver
        height={heightChart || 20} // Set the height directly for VictoryChart
      >
        {/* VictoryHistogram to render the histogram */}
        <VictoryHistogram
          data={formattedData}
          bins={validBins}
          style={
            style || {
              data: {
                fill: "rgba(241, 214, 247, 0.5)",
                stroke: "rgba(241, 214, 247, 1)",
                strokeWidth: 1,
              },
            }
          }
          labels={() => null} // Hide labels
        />
        {/* VictoryAxis to hide the x-axis */}
        <VictoryAxis
          style={{
            axis: { stroke: "none" },
            ticks: { stroke: "none" },
            tickLabels: { fill: "none" },
          }}
        />
        {/* VictoryAxis to hide the y-axis */}
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: "none" },
            ticks: { stroke: "none" },
            tickLabels: { fill: "none" },
          }}
        />
      </VictoryChart>
    </div>
  );
};

export default VictoryChartComponent;