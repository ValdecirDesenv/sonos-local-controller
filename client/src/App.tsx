import { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const fetchApi = async () => {
    const response = await axios.get('http://localhost:3000/api');
    console.log(response.data);
  };

  useEffect(() => {
    fetchApi();
  }, []);

  return (
    <>
      <h1>Vite + React</h1>
    </>
  );
}

export default App;
