import React, { useState, useEffect, useRef } from "react";
import * as duckdb from "@duckdb/duckdb-wasm";
import { Chart, registerables } from "chart.js";
import VictoryChart from "./VictoryChart";
import InfoWithChartAnalysis from "./InfoWithChartAnalysis";
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
  const [originalQuery, setoriginalQuery] = useState<string>(`
    with base_query as (
      select * from house_prices
    ),
    cols as (
      unpivot (
        from base_query select
          {
            name: first(alias(columns(*))),
            type: first(typeof(columns(*))),
            max: max(columns(*))::varchar,
            min: min(columns(*))::varchar,
            approx_unique: approx_count_distinct(columns(*)),
            nulls: count(*) - count(columns(*)),
          }
      ) on columns(*)
    )
    select value.* from cols
  `);
  const [customQuery, setCustomQuery] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    if (dataLoaded) {
      return;
    }
    setDataLoaded(true);
    const db = await instantiate(duckdb);
    const conn = await db.connect();

    await conn.query(`
      CREATE TABLE house_prices AS 
      SELECT * FROM read_parquet('https://www.tablab.app/sample-datasets/house-price.parquet');
    `);
    const columnData = await conn.query(`SELECT * FROM house_prices`);
    const columsStats = await conn.query(customQuery || originalQuery);

    const columsCount = await conn.query(`
      with base_query as (
        select * from house_prices 
      )
      SELECT 
      count(*) as count
      FROM base_query
    `);

    const columns: string[] = columnData.schema.fields.map(
      (field: { name: string }) => field.name
    );

    const statsArray = columsStats.toArray();
    const dataArray = columnData.toArray();

    const combinedData = columns.map((column) => {
      const stats = statsArray.find((item: any) => item.name === column);
      const values = dataArray.map((row: any) =>
        typeof row[column] == "bigint" ? row[column].toString() : row[column]
      );

      return {
        label: column,
        type: stats?.type,
        max: stats?.max,
        min: stats?.min,
        approx_unique: stats?.approx_unique,
        nulls: stats?.nulls,
        values: values, // Values from columnData referred to by name
      };
    });
    setStatsData(combinedData);

    // setStatsData(
    //   columns.map((column: string) => ({
    //     label: column,
    //     type: typeof dataArray[0]?.[column],
    //     value: dataArray.map((row: Record<string, any>) =>
    //       typeof row[column] === "bigint"
    //         ? row[column].toString()
    //         : row[column]
    //     ),
    //   }))
    // );

    await conn.close();
    setDataLoaded(false);
  };
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
      <textarea
        value={customQuery}
        onChange={(e) => setCustomQuery(e.target.value)}
        className="w-full h-20 border p-2 mb-2"
        placeholder="Enter custom SQL query..."
      />
      <button
        onClick={fetchData}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Run Query
      </button>
      {!dataLoaded ? (
        statsData.map((stats, idx) => (
          <div className="m-1">
            <div
              key={idx}
              onClick={() => openInfo(stats.label)}
              className={`grid grid-cols grid-flow-col h-5 text-sm ${
                stats.type == "BIGINT"
                  ? "hover:bg-[#f4ebf7]"
                  : "hover:bg-[#f0f9ff]"
              }`}
            >
              <div className="flex items-center">
                <img
                  src={`${
                    stats.type == "BIGINT" ? "/123.png" : "/letter-t-.png"
                  }`}
                  className="w-3 h-3"
                />
                <div className="text-left w-20 px-1">{stats.label}</div>
              </div>
              <div className="w-16">
                {stats.type == "BIGINT" ? (
                  <VictoryChart data={stats.values} />
                ) : (
                  <button className="border-l border-blue-500 w-full">
                    <div className="w-full font-semibold p-0 text-right bg-[#f0f9ff] transition duration-300 border-2 border-transparent hover:border-blue-600">
                      {countUnique(stats.values)}
                    </div>
                  </button>
                )}
              </div>
              <div>...</div>
            </div>
            <div className="px-3">
              {itemSelected && itemSelected === stats.label ? (
                stats.type === "BIGINT" ? (
                  <InfoWithChartAnalysis data={stats} />
                ) : (
                  <InfoAnalysis data={stats.values} />
                )
              ) : null}
            </div>
          </div>
        ))
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default App;
