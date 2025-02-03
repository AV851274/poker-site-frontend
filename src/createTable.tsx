import { useState } from 'react';
import './App.css'
import { useAuthOutletContext } from './authPage';

function CreateTable() {
  const [maxPlayers, setMaxPlayers] = useState(9);
  const [name, setName] = useState('');
  const [smallBlind, setSmallBlind] = useState('');
  const [bigBlind, setBigBlind] = useState('');
  const [ante, _setAnte] = useState('');

  const { token } = useAuthOutletContext();

  async function create() {
    // TODO: form validation
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/table/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxPlayers, name, blinds: [Math.round(parseFloat(smallBlind)*100) || 1, Math.round(parseFloat(bigBlind)*100) || 2], game: 'NLH', sideGames: [], ante: Math.round(parseFloat(ante)*100) || 0,
      }),
    });
    const resj = await res.json();
    if (!resj.success) {
      console.error(resj);
    } else {
      window.location.href = "/v1/table/"+resj.data.id;
    }
  }

  return (
    <div className="midbox">
      <div className="create-table">
        <h1>Create Table</h1>
        <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Name" />
        <input style={{marginTop: '5px'}} value={smallBlind} onChange={e => setSmallBlind(e.target.value)} type="number" placeholder="Small Blind"/>
        <input style={{marginTop: '5px'}} value={bigBlind} onChange={e => setBigBlind(e.target.value)} type="number" placeholder="Big Blind"/>
        <div style={{marginTop: '5px'}} className="radio">
          <button onClick={_ => setMaxPlayers(6)} className={maxPlayers == 6 ? 'radio-active' : ''}>6 Max</button>
          <button onClick={_ => setMaxPlayers(9)} className={maxPlayers == 9 ? 'radio-active' : ''}>9 Max</button>
        </div>
        <button style={{marginTop: '1em'}} onClick={create}>Create</button>
      </div>
    </div>
  )
}

export default CreateTable
