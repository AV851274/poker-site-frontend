export enum Suit {
  HEARTS,
  CLUBS,
  SPADES,
  DIAMONDS,
}

export interface Card {
  suit: string,
  rank: "A" | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K',
}

export enum GameType {
  NLH,
}

export enum SideGame {
  BOMBPOT,
}

export enum ActionTypeEnum {
  BET,
  CHECK,
  FOLD,
}

export enum PlayerStatus {
  AWAY,
  ACTIVE,
}

export interface ITableConfig {
  maxPlayers: number,
  game: string,
  sideGames: string[],
  blinds: [number, number],
  ante: number,
}

export interface ITablePlayer {
  stack: number,
  bet: number,
  isYou: boolean,
  allIn: boolean,
  inHand: boolean,
  isShowing: boolean,
  status: "ACTIVE" | "AWAY",
  displayName: string,
  _id: string,
  username: string,
  agreeToRunItTwice: boolean,
  holeCards: Card[],
  winner: boolean,
  folded: boolean,
}

export interface IPot {
  size: number,
  players: ITablePlayer[],
}

export interface IAction {
  bet: number,
  type: string,
  auto: boolean,
  player: ITablePlayer,
}

export interface ILedgerData {
  buyIn: number,
  dipped: boolean,
  dippedWithStack: number,
  displayName: string,
}

export interface ITable {
  name: string,
  config: ITableConfig,
  owner: string,
  active: boolean,
  turn: number, // seat index
  dealer: number,
  currentBet: number,
  minBet: number,
  turnStarted: Date,
  players: { [seat: number]: ITablePlayer },
  ledger: { [pid: string]: ILedgerData },
  pots: IPot[],
  deck: Card[],
  communityCards: Card[][],
  actions: IAction[],
  decidingRunItTwice: boolean,
  createdAt: Date,
  _id: string,
}

export interface IChatMessage {
  author: ITablePlayer,
  message: string,
  createdAt: Date,
  tableId: string,
  server: boolean,
}

export interface IIngressRequest extends Document {
  _id: string,
  tid: string,
  pid: string,
  displayName: string,
  stack: number,
  seat: number,
  createdAt: Date,
}
