import { useRef, useEffect, useState, FormEvent } from 'react';
import Spile from './assets/Spile.svg';
import XSpile from './assets/XSpile.svg';
import Mpile from './assets/Mpile.svg';
import Lpile from './assets/Lpile.svg';
import XLpile from './assets/XLpile.svg';
import { IChatMessage, IIngressRequest, ITable } from './backendTypes';
import ConfettiExplosion from 'react-confetti-explosion';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useParams } from 'react-router-dom';
import { useAuthOutletContext } from './authPage';
import BetSound from './assets/bet.mp3';
import ChatSound from './assets/chat.mp3';
import CheckSound from './assets/check.mp3';
import DealSound from './assets/deal.mp3';
import FoldSound from './assets/fold.mp3';
import WarningSound from './assets/warning.mp3';
import WelcomeSound from './assets/welcome.mp3';
import useSound from 'use-sound';

function Table() {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [table, setTable] = useState<ITable | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [modal, setModal] = useState(false);
  const [JRModal, setJRModal] = useState(false);
  const [ledgerModal, setLedgerModal] = useState(false);
  const [joiningSeat, setJoiningSeat] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [stack, setStack] = useState('');
  const [R, setR] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [ingressRequests, setIngressRequests] = useState<IIngressRequest[]>([]);
  const [_previousState, setPreviousState] = useState<ITable | null>(null);

  const [playBetSound] = useSound(BetSound);
  const [playChatSound] = useSound(ChatSound);
  const [playCheckSound] = useSound(CheckSound);
  const [playDealSound] = useSound(DealSound);
  const [playFoldSound] = useSound(FoldSound);
  const [playWarningSound] = useSound(WarningSound);
  const [playWelcomeSound] = useSound(WelcomeSound);

  const { tid } = useParams();
  const { token } = useAuthOutletContext();
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `ws${new URL(import.meta.env.VITE_API_BASE).protocol === 'https:' ? 's' : ''}://${new URL(import.meta.env.VITE_API_BASE).host}/ws/${tid}?token=${token}&${R}`
  );

  function dec(n: number): number {
    return Number((n/100).toFixed(2));
  }

  useEffect(() => {
    if (!lastMessage) {
      console.warn('No WS message');
      return;
    }
    const payload = JSON.parse(lastMessage.data);
    if (payload.type === 'CHAT') {
      setMessages([...messages, payload.data]);
      if (payload.data.server) {
        if (payload.data.message.endsWith('checked')) {
          playCheckSound();
        } else if (payload.data.message.includes(' bet ') || payload.data.message.includes(' jammed for ') || payload.data.message.includes(' called for ')) {
          playBetSound();
        } else if (payload.data.message.endsWith('folded')) {
          playFoldSound();
        } else if (payload.data.message.includes(' bought in for ')) {
          playWelcomeSound();
        } else if (payload.data.message == 'Wake tf up') {
          const yourTurn = (Object.entries(table?.players || []).filter(p => p[1].isYou)[0]||[null])[0] == table?.turn.toString();
          if (yourTurn) playWarningSound();
        }
      } else {
        playChatSound();
      }
    } else if (payload.type === 'STATE') {
      console.log(payload.data);
      setPreviousState(table);
      if (table?.currentBet !== payload.data.currentBet) {
        setBetAmount(dec(payload.data.minBet));
      }
      if (table?.communityCards.length && table?.communityCards[0].length === 5 && !payload.data.communityCards[0]) {
        for (const [_, __] of Object.entries(payload.data.players)) {
          playDealSound();
        }
      } else if (table?.communityCards.length && payload.data.communityCards.length && table?.communityCards[0].length < payload.data.communityCards[0].length) {
        playDealSound();
      } else if (table?.communityCards[0] == undefined && payload.data.communityCards.length) {
        playDealSound();
      }
      setTable(payload.data);
    } else if (payload.type === 'BOOT') {
      setR(!R);
    }
  }, [lastMessage]);

  async function sendChat() {
    if (!chatInput || chatInput.length > 200) {
      console.warn('Too large');
      return;
    }
    sendMessage(JSON.stringify({
      type: 'SEND_CHAT',
      data: {
        message: chatInput,
      }
    }));
    setChatInput('');
  }

  function join(n: number) {
    setJoiningSeat(n);
    setModal(true);
  }

  const [error, setError] = useState('');
  const [errorClass, setErrorClass] = useState('none');

  function joinSeat() {
    //@ts-ignore
    if (isNaN(stack) || isNaN(parseFloat(stack))) {
      setError("Try typing in a real number, dumbass.");
      return;
    }
    let amount = Math.round(parseFloat(stack)*100)
    if (isNaN(amount)) {
      setError("Try typing in a real number, dumbass.");
      return;
    }
    let data = {displayName, amount, seat: joiningSeat};
    console.log(data.amount)
    if (typeof data.displayName !== "string" || data.displayName.length > 10 || !/^[a-zA-Z0-9]+$/.test(data.displayName)) {
      setError('Please sir please stop');
      return;
    }
    if (typeof data.amount !== "number" || data.amount < 1 || !Number.isSafeInteger(data.amount)) {
      setError('Number too big for my small register');
      return;
    }
    if (typeof data.seat !== "number") {
      setError('SOmething went wrong');
      return;
    };

    sendMessage(JSON.stringify({
      type: 'SIT',
      data
    }));
    setModal(false);
  }

  function start() {
    sendMessage(JSON.stringify({
      type: 'START',
      data: {},
    }));
  }

  function call() {
    sendMessage(JSON.stringify({
      type: 'CALL',
      data: {},
    }));
  }

  function check() {
    sendMessage(JSON.stringify({
      type: 'CHECK',
      data: {},
    }));
  }

  function stop() {
    sendMessage(JSON.stringify({
      type: 'PAUSE',
      data: {},
    }));
  }

  function bet() {
    sendMessage(JSON.stringify({
      type: 'BET',
      data: {
        amount: Math.round(betAmount*100),
      },
    }));
  }

  function fold() {
    sendMessage(JSON.stringify({
      type: 'FOLD',
      data: {},
    }));
  }

  function show() {
    sendMessage(JSON.stringify({
      type: 'SHOW',
      data: {},
    }));
  }

  function away() {
    sendMessage(JSON.stringify({
      type: 'AWAY',
      data: {},
    }));
  }

  function back() {
    sendMessage(JSON.stringify({
      type: 'BACK',
      data: {},
    }));
  }

  function leave() {
    sendMessage(JSON.stringify({
      type: 'LEAVE',
      data: {},
    }));
  }

  function pileSize(bet: number) {
    if (bet < table!.config.blinds[1]*5) {
      return XSpile;
    } else if (bet < table!.config.blinds[1]*10) {
      return Spile;
    } else if (bet < table!.config.blinds[1]*20) {
      return Mpile;
    } else if (bet < table!.config.blinds[1]*50) {
      return Lpile;
    } else {
      return XLpile;
    }
  }

  const cid = (rank: string, suit: string) => `${rank.replace('10', 't')}${suit == 'SPADES' ? 's' : suit == 'HEARTS' ? 'h' : suit == 'DIAMONDS' ? 'd' : suit == 'CLUBS' ? 'c' : ''}`

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];
  console.info(connectionStatus);

  useEffect(() => {
    console.log(777);
    setErrorClass('error');
    setTimeout(() => {
      setErrorClass('none');
      setError('');
    }, 6000);
  }, [error]);

  const [declined, setDeclined] = useState(false);
  useEffect(() => {
    if (declined == false) return;
    setTimeout(() => {
      setDeclined(false);
    }, 5000);
  }, [declined]);


  if (table === null) {
    return (
      <>
        <h1>Loading!</h1>
      </>
    )
  }
  const totalPot = table.pots.reduce((accum, pot) => accum + pot.size, 0);
  const uid = JSON.parse(atob(token.split('.')[1])).uid;
  const you = Object.values(table.players).filter(p => p.isYou)[0] || null;
  const yourTurn = (Object.entries(table.players).filter(p => p[1].isYou)[0]||[null])[0] == table.turn.toString();
  const foldedThrough = Object.values(table.players).filter(p => p.inHand).length == 1;
  const jamPot = Object.values(table.players).filter(p => p.inHand && !p.folded && !p.allIn).length <= 1;

  function unshow() {
    if (!foldedThrough) return;
    sendMessage(JSON.stringify({
      type: 'UNSHOW',
      data: {},
    }));
  }

  function runItTwice() {
    setDeclined(true);
    sendMessage(JSON.stringify({
      type: 'RUN_IT_TWICE',
      data: {},
    }));
  }

  const AlwaysScrollToBottom = () => {
    const elementRef = useRef<HTMLDivElement>(null);
    useEffect(() => (elementRef.current! as any).scrollIntoView());
    return <div ref={elementRef} />;
  };

  async function joinRequests() {
    if (table == null) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/table/${table._id}/ingress`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const resj = await res.json();
    if (!resj.success) {
      console.error(resj);
    } else {
      setIngressRequests(resj.data);
    }
    setJRModal(true);
  }

  function approveIngress(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    sendMessage(JSON.stringify({
      type: 'APPROVE',
      data: {
        playerId: data.get('playerId'),
        ingressRequestId: data.get('ingressRequestId'),
        displayName: data.get('displayName'),
        stack: Math.round(parseFloat(data.get('stack')!.toString())*100),
        seat: parseInt(data.get('seat')!.toString()),
      },
    }));
    if (ingressRequests.length == 1) setJRModal(false);
    setIngressRequests([...ingressRequests.filter(x => x._id !== data.get('ingressRequestId')!.toString())]);
  }

  function denyIngress(id: string) {
    sendMessage(JSON.stringify({
      type: 'DENY',
      data: {
        ingressRequestId: id,
      },
    }));
    if (ingressRequests.length == 1) setJRModal(false);
    setIngressRequests([...ingressRequests.filter(x => x._id !== id)]);
  }

  const rit = table.decidingRunItTwice && you.inHand;
  return (
    <>
      <input id="hamburger" type="checkbox" />
      <label htmlFor="hamburger" className="dropdown">
        <span className="hamburger">
          <span className="icon-bar top-bar"></span>
          <span className="icon-bar middle-bar"></span>
          <span className="icon-bar bottom-bar"></span>
        </span>
      </label>
      <div className={errorClass}>
        <span>{error}</span>
      </div>
      { rit && !declined ?
        <div className="rit">
          <p>Run It Twice?</p>
          <button onClick={runItTwice}>Accept</button>
          <button onClick={_ => setDeclined(true)}>Decline</button>
        </div>
      : null }
      { modal ?
      <div className="modal">
        <div className="modal-content">
          <div className="modal-header">
            <h1>{`Join Seat #${joiningSeat}`}</h1>
          </div>
          <div className="modal-body">
            <input pattern="[A-Za-z0-9]*" value={displayName} onChange={e => setDisplayName(e.target.value.replace(/\W/g, ''))} type="text" placeholder="Display Name" />
            <input value={stack} onChange={e => setStack(e.target.value)} style={{marginTop: '5px'}} type="number" placeholder="Chip Stack" />
            <button onClick={joinSeat} style={{marginTop: '1em'}}>Join</button>
            <button onClick={_ => setModal(false)} style={{marginTop: '5px'}}>Cancel</button>
          </div>
        </div>
        <div onClick={_ => setModal(false)} className="modal-bg"></div>
      </div>
      : null }
      { ledgerModal ?
      <div className="modal">
        <div className="modal-content">
          <div className="modal-header">
            <h1>Ledger</h1>
          </div>
          <div className="modal-body">
            <div className="ingresses" style={{display: 'flex', flexDirection: 'column', gap: '0.5em'}}>
              { Object.entries(table.ledger).map(xp => (
              <div className="ingress">
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <span>{xp[1].displayName}</span>
                  <span>{((xp[1].dipped ? xp[1].dippedWithStack : xp[1].dippedWithStack + Object.values(table.players).filter(p => p._id == xp[0])[0].stack) - xp[1].buyIn) > 0 ? 'Currently winning' : 'Damn this guy sucks'}</span>
                </div>
                <div style={{display: 'flex', gap: '1em', flexDirection: 'row'}}>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span>Buy In</span>
                    <span>{dec(xp[1].buyIn)}</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span>Winnings</span>
                    <span>{dec(xp[1].dipped ? xp[1].dippedWithStack : Object.values(table.players).filter(p => p._id == xp[0])[0].stack + xp[1].dippedWithStack)}</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span>Profit</span>
                    <span>{dec((xp[1].dipped ? xp[1].dippedWithStack : xp[1].dippedWithStack + Object.values(table.players).filter(p => p._id == xp[0])[0].stack) - xp[1].buyIn)}</span>
                  </div>
                </div>
              </div>
              )) }
            </div>
          </div>
        </div>
        <div onClick={_ => setLedgerModal(false)} className="modal-bg"></div>
      </div>
      : null }
      { JRModal ?
      <div className="modal">
        <div className="modal-content">
          <div className="modal-header">
            <h1>Join Requests</h1>
          </div>
          <div className="modal-body">
            <div className="ingresses" style={{display: 'flex', flexDirection: 'column', gap: '0.5em'}}>
              { ingressRequests.map(req => (
              <form className="ingress" onSubmit={approveIngress}>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <span>{req.displayName}</span>
                  <span>{`Wants to join Seat #${req.seat}`}</span>
                </div>
                <div style={{display: 'flex', flexDirection: 'row'}}>
                  <input type="number" defaultValue={dec(req.stack)} name="stack" />
                  <button type="submit">Approve</button>
                  <button onClick={_ => { denyIngress(req._id) }}>Deny</button>
                </div>
                <input type="hidden" name="playerId" value={req.pid} />
                <input type="hidden" name="ingressRequestId" value={req._id} />
                <input type="hidden" name="displayName" value={req.displayName} />
                <input type="hidden" name="seat" value={req.seat} />
              </form>
              )) }
              { ingressRequests.length == 0 ?
                <span>Nothing here yet</span>
              : null }
            </div>
          </div>
        </div>
        <div onClick={_ => setJRModal(false)} className="modal-bg"></div>
      </div>
      : null }
      <div className="menu">
        <div className="info">
          <h1 className="table-name">{table.name}</h1>
          <p>{`Game Mode: ${table.config.game}`}</p>
          { table.config.sideGames.length ? <p>{`Side Games: ${table.config.sideGames.join(", ")}`}</p> : null }
          <p>{`Blinds: ${table.config.blinds.map(n => dec(n)).join('/')}`}</p>
          { table.config.ante ? <p>{`Ante: ${dec(table.config.ante)}`}</p> : null }
          <p>{`Players: ${Object.keys(table.players).length}/${table.config.maxPlayers}`}</p>
        </div>
        <div className="actions">
          <button onClick={_ => setLedgerModal(true)}>Ledger</button>
          { you ?
            <button onClick={leave}>Skedaddle</button>
          : null }
          { !you ?
            null
          : you.status == 'ACTIVE' ?
            <button onClick={away}>Set Away</button>
          :
            <button onClick={back}>So back</button>
          }
          { table.owner == uid ?
            <>
            { !table.active ?
              <button onClick={start}>Start Game</button>
            :
              <button onClick={stop}>Stop Game</button>
            }
              <button onClick={joinRequests}>Join Requests</button>
            </>
          : null }
        </div>
        <div className="chat">
          <div className="messages">
            { messages.map(message =>
              <div className="chat-message">
                <div><span style={message.server ? {color: 'purple'} : {}}>{message.author.displayName}</span>{`: ${message.message}`}</div>
                <span className="chat-timestamp">{new Date(message.createdAt).toLocaleTimeString()}</span>
              </div>
            ) }
            <AlwaysScrollToBottom />
          </div>
          <div className="send">
            <input onKeyUp={e => e.key === 'Enter' ? sendChat() : null } value={chatInput} onChange={e => { setChatInput(e.target.value) }} type="text" placeholder="Chat Message" />
            <button onClick={sendChat}>Send</button>
          </div>
        </div>
      </div>
      <div className="floor">
        <div className="table">
          <div className="seats">
            <div className="seats-left">
              { 0 in table.players ?
                <div className={`player${table.turn == 0 ? ' action-on' : ''}`}>
                  <div className="hand">
                    <div className="stack"><span>{dec(table.players[0].stack)}</span></div>
                    { table.players[0].winner ? <ConfettiExplosion width={1000} /> : null }
                    { table.players[0].holeCards.length ?
                      <div onClick={table.players[0].isYou ? table.players[0].isShowing ? unshow : show : (() => {})}>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" cid={cid(table.players[0].holeCards[0].rank, table.players[0].holeCards[0].suit)} />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" cid={cid(table.players[0].holeCards[1].rank, table.players[0].holeCards[1].suit)} />
                        { table.players[0].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[0].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[0].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        :
                        table.players[0].isShowing && foldedThrough && table.players[0].isYou ?
                          <div className="showing">
                            <span>Showing</span>
                          </div>
                        : null }
                      </div>
                      :
                      <>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" backcolor="#272727" backtext="" rank="0" />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" backcolor="#272727" backtext="" rank="0" />
                        { table.players[0].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[0].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[0].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        : null }
                      </>
                    }
                    <div className="details">
                      <p>{table.players[0].displayName}</p>
                    </div>
                  </div>
                  { table.players[0].bet ?
                    <div className="bet">
                      <img src={pileSize(table.players[0].bet)} />
                      <span>{dec(table.players[0].bet)}</span>
                    </div>
                  : null }
                </div>
              :
                <div onClick={_ => join(0)} className={`player open${you ? ' invis' : null}`}>
                  <div className="hand">
                    <div className="seat"><span>Take Seat</span></div>
                    <div className="stack"><span>{`Seat 0`}</span></div>
                    <div className="details">
                      <span>Open</span>
                    </div>
                  </div>
                </div>
              }
            </div>
            <div className="seats-right">
              { (table.config.maxPlayers === 9 && 4 in table.players) || (table.config.maxPlayers === 6 && 3 in table.players) ? (
                <div className={`player${table.turn == (table.config.maxPlayers === 9 ? 4 : 3) ? ' action-on' : ''}`}>
                  <div className="hand">
                    <div className="stack"><span>{dec(table.players[table.config.maxPlayers === 9 ? 4 : 3].stack)}</span></div>
                    { table.players[table.config.maxPlayers === 9 ? 4 : 3].winner ? <ConfettiExplosion width={1000} /> : null }
                    { table.players[table.config.maxPlayers === 9 ? 4 : 3].holeCards.length ?
                      <div onClick={table.players[table.config.maxPlayers === 9 ? 4 : 3].isYou ? table.players[table.config.maxPlayers === 9 ? 4 : 3].isShowing ? unshow : show : (() => {})}>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" cid={cid(table.players[table.config.maxPlayers === 9 ? 4 : 3].holeCards[0].rank, table.players[table.config.maxPlayers === 9 ? 4 : 3].holeCards[0].suit)} />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" cid={cid(table.players[table.config.maxPlayers === 9 ? 4 : 3].holeCards[1].rank, table.players[table.config.maxPlayers === 9 ? 4 : 3].holeCards[1].suit)} />
                        { table.players[table.config.maxPlayers === 9 ? 4 : 3].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 4 : 3].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 4 : 3].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 4 : 3].isShowing && foldedThrough && table.players[table.config.maxPlayers === 9 ? 4 : 3].isYou ?
                          <div className="showing">
                            <span>Showing</span>
                          </div>
                        : null }
                      </div>
                      :
                      <>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" backcolor="#272727" backtext="" rank="0" />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" backcolor="#272727" backtext="" rank="0" />
                        { table.players[table.config.maxPlayers === 9 ? 4 : 3].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 4 : 3].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 4 : 3].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        : null }
                      </>
                    }
                    <div className="details">
                      <span>{table.players[table.config.maxPlayers === 9 ? 4 : 3].displayName}</span>
                    </div>
                  </div>
                  { table.players[table.config.maxPlayers === 9 ? 4 : 3].bet ?
                    <div className="bet">
                      <img src={pileSize(table.players[table.config.maxPlayers === 9 ? 4 : 3].bet)} />
                      <span>{dec(table.players[table.config.maxPlayers === 9 ? 4 : 3].bet)}</span>
                    </div>
                  : null }
                </div>
              )
              :
                <div onClick={_ => join(table.config.maxPlayers === 9 ? 4 : 3)} className={`player open${you ? ' invis' : null}`}>
                  <div className="hand">
                    <div className="seat"><span>Take Seat</span></div>
                    <div className="stack"><span>{`Seat ${table.config.maxPlayers === 9 ? 4 : 3}`}</span></div>
                    <div className="details">
                      <span>Open</span>
                    </div>
                  </div>
                </div>
              }
            </div>
            <div className="seats-top">
              { 1 in table.players ? (
                <div className={`player${table.turn == 1 ? ' action-on' : ''}`}>
                  <div className="hand">
                    <div className="stack"><span>{dec(table.players[1].stack)}</span></div>
                    { table.players[1].winner ? <ConfettiExplosion width={1000} /> : null }
                    { table.players[1].holeCards.length ?
                      <div onClick={table.players[1].isYou ? table.players[1].isShowing ? unshow : show : (() => {})}>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" cid={cid(table.players[1].holeCards[0].rank, table.players[1].holeCards[0].suit)} />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" cid={cid(table.players[1].holeCards[1].rank, table.players[1].holeCards[1].suit)} />
                        { table.players[1].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[1].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[1].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        :
                        table.players[1].isShowing && foldedThrough && table.players[1].isYou ?
                          <div className="showing">
                            <span>Showing</span>
                          </div>
                        : null }
                      </div>
                      :
                      <>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" backcolor="#272727" backtext="" rank="0" />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" backcolor="#272727" backtext="" rank="0" />
                        { table.players[1].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[1].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[1].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        : null }
                      </>
                    }
                    <div className="details">
                      <span>{table.players[1].displayName}</span>
                    </div>
                  </div>
                  { table.players[1].bet ?
                    <div className="bet">
                      <img src={pileSize(table.players[1].bet)} />
                      <span>{dec(table.players[1].bet)}</span>
                    </div>
                  : null }
                </div>
              )
              :
                <div onClick={_ => join(1)} className={`player open${you ? ' invis' : null}`}>
                  <div className="hand">
                    <div className="seat"><span>Take Seat</span></div>
                    <div className="stack"><span>Seat 1</span></div>
                    <div className="details">
                      <span>Open</span>
                    </div>
                  </div>
                </div>
              }
              { 2 in table.players ? (
                <div className={`player${table.turn == 2 ? ' action-on' : ''}`}>
                  <div className="hand">
                    <div className="stack"><span>{dec(table.players[2].stack)}</span></div>
                    { table.players[2].winner ? <ConfettiExplosion width={1000} /> : null }
                    { table.players[2].holeCards.length ?
                      <div onClick={table.players[2].isYou ? table.players[2].isShowing ? unshow : show : (() => {})}>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" cid={cid(table.players[2].holeCards[0].rank, table.players[2].holeCards[0].suit)} />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" cid={cid(table.players[2].holeCards[1].rank, table.players[2].holeCards[1].suit)} />
                        { table.players[2].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[2].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[2].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        :
                        table.players[2].isShowing && foldedThrough && table.players[2].isYou ?
                          <div className="showing">
                            <span>Showing</span>
                          </div>
                        : null }
                      </div>
                      :
                      <>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" backcolor="#272727" backtext="" rank="0" />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" backcolor="#272727" backtext="" rank="0" />
                        { table.players[2].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[2].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[2].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        : null }
                      </>
                    }
                    <div className="details">
                      <span>{table.players[2].displayName}</span>
                    </div>
                  </div>
                  { table.players[2].bet ?
                    <div className="bet">
                      <img src={pileSize(table.players[2].bet)} />
                      <span>{dec(table.players[2].bet)}</span>
                    </div>
                  : null }
                </div>
              )
              :
                <div onClick={_ => join(2)} className={`player open${you ? ' invis' : null}`}>
                  <div className="hand">
                    <div className="seat"><span>Take Seat</span></div>
                    <div className="stack"><span>Seat 2</span></div>
                    <div className="details">
                      <span>Open</span>
                    </div>
                  </div>
                </div>
              }
              { table.config.maxPlayers === 9 && 3 in table.players ? (
                <div className={`player${table.turn == 3 ? ' action-on' : ''}`}>
                  <div className="hand">
                    <div className="stack"><span>{dec(table.players[3].stack)}</span></div>
                    { table.players[3].winner ? <ConfettiExplosion width={1000} /> : null }
                    { table.players[3].holeCards.length ?
                      <div onClick={table.players[3].isYou ? table.players[3].isShowing ? unshow : show : (() => {})}>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" cid={cid(table.players[3].holeCards[0].rank, table.players[3].holeCards[0].suit)} />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" cid={cid(table.players[3].holeCards[1].rank, table.players[3].holeCards[1].suit)} />
                        { table.players[3].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[3].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[3].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        :
                        table.players[3].isShowing && foldedThrough && table.players[3].isYou ?
                          <div className="showing">
                            <span>Showing</span>
                          </div>
                        : null }
                      </div>
                      :
                      <>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" backcolor="#272727" backtext="" rank="0" />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" backcolor="#272727" backtext="" rank="0" />
                        { table.players[3].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[3].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[3].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        : null }
                      </>
                    }
                    <div className="details">
                      <span>{table.players[3].displayName}</span>
                    </div>
                  </div>
                  { table.players[3].bet ?
                    <div className="bet">
                      <img src={pileSize(table.players[3].bet)} />
                      <span>{dec(table.players[3].bet)}</span>
                    </div>
                  : null }
                </div>
              )
              : table.config.maxPlayers === 9 ?
                <div onClick={_ => join(3)} className={`player open${you ? ' invis' : null}`}>
                  <div className="hand">
                    <div className="seat"><span>Take Seat</span></div>
                    <div className="stack"><span>Seat 3</span></div>
                    <div className="details">
                      <span>Open</span>
                    </div>
                  </div>
                </div>
              : null
             }
            </div>
            <div className="seats-bottom">
              { table.config.maxPlayers === 9 && 8 in table.players ? (
                <div className={`player${table.turn == 8 ? ' action-on' : ''}`}>
                  <div className="hand">
                    <div className="stack"><span>{dec(table.players[8].stack)}</span></div>
                    { table.players[8].winner ? <ConfettiExplosion width={1000} /> : null }
                    { table.players[8].holeCards.length ?
                      <div onClick={table.players[8].isYou ? table.players[8].isShowing ? unshow : show : (() => {})}>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" cid={cid(table.players[8].holeCards[0].rank, table.players[8].holeCards[0].suit)} />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" cid={cid(table.players[8].holeCards[1].rank, table.players[8].holeCards[1].suit)} />
                        { table.players[8].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[8].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[8].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        :
                        table.players[8].isShowing && foldedThrough && table.players[8].isYou ?
                          <div className="showing">
                            <span>Showing</span>
                          </div>
                        : null }
                      </div>
                      :
                      <>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" backcolor="#272727" backtext="" rank="0" />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" backcolor="#272727" backtext="" rank="0" />
                        { table.players[8].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[8].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[8].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        : null }
                      </>
                    }
                    <div className="details">
                      <span>{table.players[8].displayName}</span>
                    </div>
                  </div>
                  { table.players[8].bet ?
                    <div className="bet">
                      <img src={pileSize(table.players[8].bet)} />
                      <span>{dec(table.players[8].bet)}</span>
                    </div>
                  : null }
                </div>
              )
              : table.config.maxPlayers === 9 ?
                <div onClick={_ => join(8)} className={`player open${you ? ' invis' : null}`}>
                  <div className="hand">
                    <div className="seat"><span>Take Seat</span></div>
                    <div className="stack"><span>Seat 8</span></div>
                    <div className="details">
                      <span>Open</span>
                    </div>
                  </div>
                </div>
              : null
              }
              { table.config.maxPlayers === 9 && 7 in table.players ? (
                <div className={`player${table.turn == 7 ? ' action-on' : ''}`}>
                  <div className="hand">
                    <div className="stack"><span>{dec(table.players[7].stack)}</span></div>
                    { table.players[7].winner ? <ConfettiExplosion width={1000} /> : null }
                    { table.players[7].holeCards.length ?
                      <div onClick={table.players[7].isYou ? table.players[7].isShowing ? unshow : show : (() => {})}>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" cid={cid(table.players[7].holeCards[0].rank, table.players[7].holeCards[0].suit)} />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" cid={cid(table.players[7].holeCards[1].rank, table.players[7].holeCards[1].suit)} />
                        { table.players[7].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[7].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[7].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        :
                        table.players[7].isShowing && foldedThrough && table.players[7].isYou ?
                          <div className="showing">
                            <span>Showing</span>
                          </div>
                        : null }
                      </div>
                      :
                      <>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" backcolor="#272727" backtext="" rank="0" />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" backcolor="#272727" backtext="" rank="0" />
                        { table.players[7].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[7].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[7].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        : null }
                      </>
                    }
                    <div className="details">
                      <span>{table.players[7].displayName}</span>
                    </div>
                  </div>
                  { table.players[7].bet ?
                    <div className="bet">
                      <img src={pileSize(table.players[7].bet)} />
                      <span>{dec(table.players[7].bet)}</span>
                    </div>
                  : null }
                </div>
              )
              : table.config.maxPlayers === 9 ?
                <div onClick={_ => join(7)} className={`player open${you ? ' invis' : null}`}>
                  <div className="hand">
                    <div className="seat"><span>Take Seat</span></div>
                    <div className="stack"><span>Seat 7</span></div>
                    <div className="details">
                      <span>Open</span>
                    </div>
                  </div>
                </div>
              : null
              }
              { (table.config.maxPlayers === 9 && 6 in table.players) || (table.config.maxPlayers === 6 && 5 in table.players) ? (
                <div className={`player${table.turn == (table.config.maxPlayers === 9 ? 6 : 5) ? ' action-on' : ''}`}>
                  <div className="hand">
                    <div className="stack"><span>{dec(table.players[table.config.maxPlayers === 9 ? 6 : 5].stack)}</span></div>
                    { table.players[table.config.maxPlayers === 9 ? 6 : 5].winner ? <ConfettiExplosion width={1000} /> : null }
                    { table.players[table.config.maxPlayers === 9 ? 6 : 5].holeCards.length ?
                      <div onClick={table.players[table.config.maxPlayers === 9 ? 6 : 5].isYou ? table.players[table.config.maxPlayers === 9 ? 6 : 5].isShowing ? unshow : show : (() => {})}>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" cid={cid(table.players[table.config.maxPlayers === 9 ? 6 : 5].holeCards[0].rank, table.players[table.config.maxPlayers === 9 ? 6 : 5].holeCards[0].suit)} />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" cid={cid(table.players[table.config.maxPlayers === 9 ? 6 : 5].holeCards[1].rank, table.players[table.config.maxPlayers === 9 ? 6 : 5].holeCards[1].suit)} />
                        { table.players[table.config.maxPlayers === 9 ? 6 : 5].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 6 : 5].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 6 : 5].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 6 : 5].isShowing && foldedThrough && table.players[table.config.maxPlayers === 9 ? 6 : 5].isYou ?
                          <div className="showing">
                            <span>Showing</span>
                          </div>
                        : null }
                      </div>
                      :
                      <>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" backcolor="#272727" backtext="" rank="0" />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" backcolor="#272727" backtext="" rank="0" />
                        { table.players[table.config.maxPlayers === 9 ? 6 : 5].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 6 : 5].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 6 : 5].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        : null }
                      </>
                    }
                    <div className="details">
                      <span>{table.players[table.config.maxPlayers === 9 ? 6 : 5].displayName}</span>
                    </div>
                  </div>
                  { table.players[table.config.maxPlayers == 9 ? 6 : 5].bet ?
                    <div className="bet">
                      <img src={pileSize(table.players[table.config.maxPlayers === 9 ? 6 : 5].bet)} />
                      <span>{dec(table.players[table.config.maxPlayers === 9 ? 6 : 5].bet)}</span>
                    </div>
                  : null }
                </div>
              )
              :
                <div onClick={_ => join(table.config.maxPlayers == 9 ? 6 : 5)} className={`player open${you ? ' invis' : null}`}>
                  <div className="hand">
                    <div className="seat"><span>Take Seat</span></div>
                    <div className="stack"><span>{`Seat ${table.config.maxPlayers === 9 ? 6 : 5}`}</span></div>
                    <div className="details">
                      <span>Open</span>
                    </div>
                  </div>
                </div>
              }
              { (table.config.maxPlayers === 9 && 5 in table.players) || (table.config.maxPlayers === 6 && 4 in table.players) ? (
                <div className={`player${table.turn == (table.config.maxPlayers === 9 ? 5 : 4) ? ' action-on' : ''}`}>
                  <div className="hand">
                    <div className="stack"><span>{dec(table.players[table.config.maxPlayers === 9 ? 5 : 4].stack)}</span></div>
                    { table.players[table.config.maxPlayers === 9 ? 5 : 4].winner ? <ConfettiExplosion width={1000} /> : null }
                    { table.players[table.config.maxPlayers === 9 ? 5 : 4].holeCards.length ?
                      <div onClick={table.players[table.config.maxPlayers === 9 ? 5 : 4].isYou ? table.players[table.config.maxPlayers === 9 ? 5 : 4].isShowing ? unshow : show : (() => {})}>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" cid={cid(table.players[table.config.maxPlayers === 9 ? 5 : 4].holeCards[0].rank, table.players[table.config.maxPlayers === 9 ? 5 : 4].holeCards[0].suit)} />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" cid={cid(table.players[table.config.maxPlayers === 9 ? 5 : 4].holeCards[1].rank, table.players[table.config.maxPlayers === 9 ? 5 : 4].holeCards[1].suit)} />
                        { table.players[table.config.maxPlayers === 9 ? 5 : 4].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 5 : 4].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 5 : 4].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 5 : 4].isShowing && foldedThrough && table.players[table.config.maxPlayers === 9 ? 5 : 4].isYou ?
                          <div className="showing">
                            <span>Showing</span>
                          </div>
                        : null }
                      </div>
                      :
                      <>
                        {/*
                        // @ts-ignore */}
                        <card-t class="a" backcolor="#272727" backtext="" rank="0" />
                        {/*
                        // @ts-ignore */}
                        <card-t class="b" backcolor="#272727" backtext="" rank="0" />
                        { table.players[table.config.maxPlayers === 9 ? 5 : 4].status == 'AWAY' ?
                          <div className="showing away">
                            <span>Away</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 5 : 4].allIn ?
                          <div className="showing allin">
                            <span>All In</span>
                          </div>
                        :
                        table.players[table.config.maxPlayers === 9 ? 5 : 4].folded ?
                          <div className="showing folded">
                            <span>Folded</span>
                          </div>
                        : null }
                      </>
                    }
                    <div className="details">
                      <span>{table.players[table.config.maxPlayers === 9 ? 5 : 4].displayName}</span>
                    </div>
                  </div>
                  { table.players[table.config.maxPlayers === 9 ? 5 : 4].bet ?
                    <div className="bet">
                      <img src={pileSize(table.players[table.config.maxPlayers === 9 ? 5 : 4].bet)} />
                      <span>{dec(table.players[table.config.maxPlayers === 9 ? 5 : 4].bet)}</span>
                    </div>
                  : null }
                </div>
              )
              :
                <div onClick={_ => join(table.config.maxPlayers === 9 ? 5 : 4)} className={`player open${you ? ' invis' : null}`}>
                  <div className="hand">
                    <div className="seat"><span>Take Seat</span></div>
                    <div className="stack"><span>{`Seat ${table.config.maxPlayers === 9 ? 5 : 4}`}</span></div>
                    <div className="details">
                      <span>Open</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
          <div className="inner">
            <div className="pot-amount">
              { table.pots.length ?
                <h1>{`Pot: ${dec(totalPot)}`}</h1>
              : null }
            </div>
            <div className="community-cards">
              { table.communityCards.map(runout => (
                <div className="runout">
                  { runout.map(card => (
                    <>
                      {/*
                      // @ts-ignore */}
                      <card-t cid={cid(card.rank, card.suit)} />
                    </>
                  )) }
                </div>
              )) }
            </div>
          </div>
        </div>
        { you ?
        <div className="btncont">
          <div className="buttons">
            <button onClick={check} disabled={!(yourTurn && (table.currentBet == 0 || (table.currentBet == table.config.blinds[1] && !table.communityCards.length && you.bet == table.config.blinds[1])))} className="button">Check</button>
            <button onClick={fold} disabled={!(yourTurn && table.currentBet > you.bet)} className="button">Fold</button>
            <button onClick={call} disabled={!(yourTurn && table.currentBet > you.bet)} className="button">Call</button>
          </div>
          <div className="buttons">
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <div style={{display: 'flex', flexDirection: 'row'}}>
                <button disabled={!yourTurn || totalPot/4 < table.minBet || totalPot/4 > you.stack+you.bet} onClick={() => { setBetAmount(dec(totalPot/4)) }} className="button">1/4</button>
                <button disabled={!yourTurn || totalPot/3 < table.minBet || totalPot/3 > you.stack+you.bet} onClick={() => { setBetAmount(dec(totalPot/3)) }} className="button">1/3</button>
                <button disabled={!yourTurn || totalPot/2 < table.minBet || totalPot/2 > you.stack+you.bet} onClick={() => { setBetAmount(dec(totalPot/2)) }} className="button">1/2</button>
                <button disabled={!yourTurn || totalPot < table.minBet || totalPot > you.stack+you.bet} onClick={() => { setBetAmount(dec(totalPot)) }} className="button">Pot</button>
              </div>
              <input disabled={!(yourTurn && table.currentBet < (you.stack+you.bet) && !jamPot)} onChange={e => setBetAmount(parseFloat(e.target.value))} value={betAmount} type="range" min={table.minBet > you.stack ? dec(you.stack) : dec(table.minBet)} max={dec(you.stack+you.bet)} step={0.01} />
            </div>
          </div>
          <div className="buttons">
            <input disabled={!(yourTurn && table.currentBet < (you.stack+you.bet) && !jamPot)} style={{width: '5em'}} onChange={e => setBetAmount(parseFloat(e.target.value))} value={betAmount} type="number" placeholder="Bet Amount" step={dec(table.config.blinds[1])} />
            <button onClick={bet} disabled={!(yourTurn && table.currentBet < (you.stack+you.bet) && !jamPot)} className="button">{!table.currentBet ? 'Bet' : 'Raise'}</button>
          </div>
        </div>
        :
        <div className="btncont">
          <div className="buttons">
            <button disabled={true} className="button">Check</button>
            <button disabled={true} className="button">Fold</button>
            <button disabled={true} className="button">Call</button>
            </div>
          <div className="buttons">
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <div style={{display: 'flex', flexDirection: 'row'}}>
                <button disabled={true} className="button">1/4</button>
                <button disabled={true} className="button">1/3</button>
                <button disabled={true} className="button">1/2</button>
                <button disabled={true} className="button">Pot</button>
              </div>
              <input type="range" />
            </div>
          </div>
          <div className="buttons">
            <input disabled={true} style={{width: '5em'}} type="number" placeholder="Bet Amount" />
            <button disabled={true} className="button">Bet</button>
          </div>
        </div>
        }
      </div>
    </>
  )
}

export default Table
