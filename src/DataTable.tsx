import React, { useState, useEffect, useRef } from "react";
import * as duckdb from "@duckdb/duckdb-wasm";
import { Chart, registerables } from "chart.js";
import VictoryChart from "./VictoryChart";
import InfoAnalysis from "./InfoAnalysis";

Chart.register(...registerables);

async function instantiate(duckdb: any) {
  const CDN_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(CDN_BUNDLES);
  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    })
  );

  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger("DEBUG");
  const db = new duckdb.AsyncDuckDB(logger, worker);

  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);

  return db;
}

const App: React.FC = () => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const db = await instantiate(duckdb);
      const conn = await db.connect();

      await conn.query(`
        CREATE TABLE house_prices AS 
        SELECT * FROM read_parquet('https://www.tablab.app/sample-datasets/house-price.parquet');
      `);
      const result = await conn.query(`SELECT * FROM house_prices`);

      const columns: string[] = result.schema.fields.map(
        (field: { name: string }) => field.name
      );

      const dataArray = result.toArray();

      setStatsData(
        columns.map((column: string) => ({
          label: column,
          type: typeof dataArray[0]?.[column],
          value: dataArray.map((row: Record<string, any>) =>
            typeof row[column] === "bigint"
              ? row[column].toString()
              : row[column]
          ),
        }))
      );

      await conn.close();
      setDataLoaded(true);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (canvasRef.current && statsData.length > 0) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        new Chart(ctx, {
          type: "bar",
          data: {
            labels: statsData.map((d) => d.label),
            datasets: [
              {
                label: "Dữ liệu",
                data: statsData.map((d) => d.value.length),
                backgroundColor: "rgba(54, 162, 235, 0.6)",
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true },
            },
          },
        });
      }
    }
  }, [statsData]);

  const countUnique = (arr: string[]): number => new Set(arr).size;
  const [itemSelected, setItemSelected] = useState<string | null>(null);

  const openInfo = (selectedItem: string) => {
    setItemSelected(itemSelected == selectedItem ? null : selectedItem);
  };

  return (
    <div className="w-96 mx-auto">
      {dataLoaded ? (
        statsData.map((stats, idx) => (
          <div className="m-1">
            <div
              key={idx}
              className={`grid grid-cols grid-flow-col h-5 text-sm ${
                stats.type === "bigint"
                  ? "hover:bg-[#f4ebf7]"
                  : "hover:bg-[#f0f9ff]"
              }`}
            >
              <div className="flex items-center">
                <img
                  src={`${
                    stats.type === "bigint" ? "/123.png" : "/letter-t-.png"
                  }`}
                  className="w-3 h-3"
                />
                <div className="text-left w-20 px-1">{stats.label}</div>
              </div>
              <div className="w-16">
                {stats.type === "bigint" ? (
                  <VictoryChart data={stats.value} />
                ) : (
                  <button
                    className="border-l border-blue-500 w-full"
                    onClick={() => openInfo(stats.label)}
                  >
                    <div className="w-full font-semibold p-0 text-right bg-[#f0f9ff] transition duration-300 border-2 border-transparent hover:border-blue-600">
                      {countUnique(stats.value)}
                    </div>
                  </button>
                )}
              </div>
              <div>...</div>
            </div>
            {itemSelected == stats.label && (
              <div className="px-3">
                <InfoAnalysis data={stats.value} />
              </div>
            )}
          </div>
        ))
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default App;
