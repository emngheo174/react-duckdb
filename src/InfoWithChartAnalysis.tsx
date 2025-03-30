import React, { useState } from "react";
import VictoryChart from "./VictoryChart";

interface Item {
  value: string;
  count: number;
  percentage: string;
}

interface InfoWithChartAnalysis {
  data: any;
}


const StringAnalysis: React.FC<InfoWithChartAnalysis> = ({ data }) => {

  return (
    <div className="overflow-hidden transition-all text-[12px] duration-500 ease-in-out max-h-96 opacity-100 z-10">
      <div className="mt-2 space-y-2">
        <VictoryChart data={data.values} heightChart={50} />
          <div className="flex justify-between">
            <span>
              Max
            </span>
            <div
              className="rounded h-full"
            >{data.max}
            </div>
          </div>
          <div className="flex justify-between">
            <span>
              Min
            </span>
            <div
              className="rounded h-full"
            >{data.min}
            </div>
          </div>
      </div>
    </div>
  );
};

export default StringAnalysis;
