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
  const dbRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [originalQuery, setoriginalQuery] = useState<string>(``);
  const [customQuery, setCustomQuery] = useState<string>("");

  useEffect(() => {
    const initDB = async () => {
      if (!dbRef.current) {
        dbRef.current = await instantiate(duckdb); // Chỉ khởi tạo DuckDB một lần
        connRef.current = await dbRef.current.connect();
      }
    };
    initDB();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedDatabase]);

  const fetchData = async () => {
    if (dataLoaded || !selectedDatabase) {
      return;
    }

    setDataLoaded(true);
    const conn = connRef.current;

    // await conn.query(`
    //   CREATE TABLE house_prices AS
    //   SELECT * FROM read_parquet('https://www.tablab.app/sample-datasets/house-price.parquet');
    // `);
    // const columnData = await conn.query(`SELECT * FROM house_prices`);
    const columnData = await conn.query(`SELECT * FROM ${selectedDatabase}`);
    const columsStats = await conn.query(`
    with base_query as (
      select * from ${selectedDatabase}
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

    const columsCount = await conn.query(`
      with base_query as (
        select * from ${selectedDatabase} 
      )
      SELECT 
      count(*) as count
      FROM base_query
    `);
    console.log("columsCount", columsCount);

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
    setDataLoaded(false);
  };
  const createDatabase = async () => {
    if (!customQuery.trim()) return;

    const conn = connRef.current;

    try {
      setCreateLoading(true);
      // Split each "CREATE TABLE" statement
      const queryWithSemicolon = customQuery.trim().endsWith(";")
        ? customQuery
        : customQuery + ";";
      const createTableStatements = queryWithSemicolon
        .split(/;\s*CREATE TABLE/i) // Query by ';' and "CREATE TABLE"
        .map((stmt, index) => (index === 0 ? stmt : "CREATE TABLE" + stmt)) // Add the "CREATE TABLE" that was lost when splitting.
        .filter((stmt) => stmt.trim().length > 0); // Filter empty strings

      for (const query of createTableStatements) {
        await conn.query(query);

        // Query get database name
        const match = query.match(/CREATE TABLE (\w+)/i);
        if (match) {
          const dbName = match[1];

          if (!databases.includes(dbName)) {
            setDatabases((prev) => [...prev, dbName]);
          }
        }
      }
    } catch (error) {
      console.error("Query Error:", error);
    } finally {
      setCreateLoading(false);
    }

    // await conn.close();
  };

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
        onClick={createDatabase}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Run Query
      </button>
      {!createLoading ? (
        databases.length > 0 ? (
          <select
            value={selectedDatabase || ""}
            onChange={(e) => setSelectedDatabase(e.target.value)}
            className="w-full border p-2 mb-2"
          >
            <option value="">Choose Database</option>
            {databases.map((db, idx) => (
              <option key={idx} value={db}>
                {db}
              </option>
            ))}
          </select>
        ) : null
      ) : (
        <p>Creating database...</p>
      )}
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
