import React, { useState } from "react";

interface Item {
  value: string;
  count: number;
  percentage: string;
}

interface StringAnalysisProps {
  data: string[];
}

const analyzeArray = (arr: string[]) => {
  const total = arr.length;
  const counts = arr.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

  const result: Item[] = Object.entries(counts).map(([key, value]) => ({
    value: key,
    count: value,
    percentage: ((value / total) * 100).toFixed(2) + "%",
  }));

  return { result };
};

const StringAnalysis: React.FC<StringAnalysisProps> = ({ data }) => {
  const { result } = analyzeArray(data);

  return (
    <div className="overflow-hidden transition-all text-[12px] duration-500 ease-in-out max-h-96 opacity-100 z-10">
      <div className="mt-2 space-y-2">
        {result.map((item) => (
          <div className="relative">
            <div
              className="absolute z-[-1] bg-[#bae6fd] rounded h-full"
              style={{ width: `${item.percentage}` }}
            ></div>
            <div
              key={item.value}
              className="rounded-md shadow-sm flex justify-between px-1"
            >
              <div className="flex w-2/3 justify-between">
                <span>{item.value}</span>
                <span>{item.count}</span>
              </div>
              <span className="text-gray-400">{item.percentage}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StringAnalysis;
