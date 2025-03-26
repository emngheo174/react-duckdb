declare module "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js" {
    const workerUrl: string;
    export default workerUrl;
}
declare module "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url" {
    const wasmUrl: string;
    export default wasmUrl;
}