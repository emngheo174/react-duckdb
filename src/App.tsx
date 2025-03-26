import React from 'react';
import DataTable from "./DataTable";
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App h-screen flex flex-col justify-center">
      <h1 className="text-2xl">House Price Analytics</h1>
      <DataTable />
    </div>
  );
};

export default App;
