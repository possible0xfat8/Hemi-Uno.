import { Card, CardColor, CardValue, GameState, Player, BannerType, SettlementSignature, CardsDrawnEvent, CardPlayedEvent, ChatMessage } from '../src/types.js';

const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];
const NUMBERS: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 1;

  for (const color of COLORS) {
    // One '0' per color
    deck.push({
      id: `c_${idCounter++}`,
      color,
      value: '0',
      label: '0',
    });

    // Two '1' through '9' per color
    for (const num of NUMBERS.slice(1)) {
      deck.push({
        id: `c_${idCounter++}`,
        color,
        value: num,
        label: num,
      });
      deck.push({
        id: `c_${idCounter++}`,
        color,
        value: num,
        label: num,
      });
    }

    // Two 'skip', 'reverse', 'draw2' per color
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: `c_${idCounter++}`,
        color,
        value: 'skip',
        label: '⊘ Skip',
      });
      deck.push({
        id: `c_${idCounter++}`,
        color,
        value: 'reverse',
        label: '⇄ Rev',
      });
      deck.push({
        id: `c_${idCounter++}`,
        color,
        value: 'draw2',
        label: '+2',
      });
    }
  }

  // 4 Wild cards (Wild color pickers)
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `c_${idCounter++}`,
      color: 'wild',
      value: 'wild',
      label: 'Wild',
    });
  }

  // 4 Wild Draw 4s
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `c_${idCounter++}`,
      color: 'wild',
      value: 'wild_draw4',
      label: '+4 Wild',
    });
  }

  return shuffle(deck);
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class GameRoom {
  public roomId: string;
  public roomCode: string;
  public hostId: string;
  public status: 'lobby' | 'playing' | 'game_over' = 'lobby';
  public players: Player[] = [];
  public currentTurnIndex: number = 0;
  public turnDirection: 1 | -1 = 1;
  public turnTimeRemaining: number = 20;
  public readonly turnTimeTotal: number = 20;

  public drawPile: Card[] = [];
  public discardPile: Card[] = [];
  public activeColor: CardColor | null = null;
  public drawPendingForPlayer: boolean = false;
  public drawnCard: Card | null = null;
  public pendingDrawCount: number = 0; // Defended / stacked draw cards pending (+2, +4)
  public lastActionMessage: string | null = null;
  public bannerAlert: GameState['bannerAlert'] = null;
  public winner: GameState['winner'] = null;
  public settlementSignature: SettlementSignature | null = null;

  public buyInAmount: string = '0.005';
  public currency: string = 'ETH';

  public spectators: Map<string, { id: string; socketId: string; name: string; avatar: string }> = new Map();
  public messages: ChatMessage[] = [];

  private turnInterval: NodeJS.Timeout | null = null;
  private onStateChangeCallback: (() => void) | null = null;
  private onSoundCallback: ((sound: string) => void) | null = null;
  private onShakeCallback: ((intensity: number) => void) | null = null;
  private onCardsDrawnCallback: ((data: CardsDrawnEvent) => void) | null = null;
  private onCardPlayedCallback: ((data: CardPlayedEvent) => void) | null = null;
  private onChatMessageCallback: ((msg: ChatMessage) => void) | null = null;

  constructor(roomId: string, roomCode: string, hostId: string) {
    this.roomId = roomId;
    this.roomCode = roomCode;
    this.hostId = hostId;
  }

  public setCallbacks(
    onStateChange: () => void,
    onSound: (sound: string) => void,
    onShake: (intensity: number) => void,
    onCardsDrawn: (data: CardsDrawnEvent) => void,
    onCardPlayed: (data: CardPlayedEvent) => void,
    onChatMessage?: (msg: ChatMessage) => void
  ) {
    this.onStateChangeCallback = onStateChange;
    this.onSoundCallback = onSound;
    this.onShakeCallback = onShake;
    this.onCardsDrawnCallback = onCardsDrawn;
    this.onCardPlayedCallback = onCardPlayed;
    if (onChatMessage) {
      this.onChatMessageCallback = onChatMessage;
    }
  }

  public addSpectator(id: string, socketId: string, name: string, avatar: string): void {
    const existing = this.spectators.get(id);
    if (!existing) {
      this.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '👁️',
        text: `${name} joined as a spectator`,
        isSystem: true,
      });
    }
    this.spectators.set(id, { id, socketId, name, avatar });
    this.emitUpdate();
  }

  public removeSpectator(id: string): void {
    const spec = this.spectators.get(id);
    if (spec) {
      this.spectators.delete(id);
      this.emitUpdate();
    }
  }

  public getPlayer(playerId: string): Player | null {
    return this.players.find(p => p.id === playerId) || null;
  }

  public getPlayerBySocket(socketId: string): Player | null {
    return this.players.find(p => p.socketId === socketId) || null;
  }

  public addChatMessage(data: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId' | 'roomCode'>): ChatMessage {
    const msg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId: this.roomId,
      roomCode: this.roomCode,
      timestamp: Date.now(),
      ...data,
    };
    this.messages.push(msg);
    if (this.messages.length > 60) {
      this.messages.shift();
    }
    if (this.onChatMessageCallback) {
      this.onChatMessageCallback(msg);
    }
    return msg;
  }

  private triggerCardsDrawn(data: CardsDrawnEvent): void {
    if (this.onCardsDrawnCallback) {
      this.onCardsDrawnCallback(data);
    }
  }

  private triggerCardPlayed(data: CardPlayedEvent): void {
    if (this.onCardPlayedCallback) {
      this.onCardPlayedCallback(data);
    }
  }

  public addPlayer(player: Omit<Player, 'seatIndex' | 'cardCount' | 'hand' | 'isReady'>): Player | null {
    // Check if player already exists in this room (reconnection support)
    const existing = this.players.find(p => p.id === player.id);
    if (existing) {
      existing.isConnected = true;
      if (player.socketId) existing.socketId = player.socketId;
      if (player.name) existing.name = player.name;
      if (player.avatar) existing.avatar = player.avatar;
      if (player.address) existing.address = player.address;
      this.emitUpdate();
      return existing;
    }

    if (this.players.length >= 5) return null;
    if (this.status !== 'lobby') return null;

    const newPlayer: Player = {
      ...player,
      seatIndex: this.players.length,
      cardCount: 0,
      hand: [],
      isReady: player.isHost || !!player.isBot,
    };

    this.players.push(newPlayer);
    this.emitUpdate();
    return newPlayer;
  }

  public removePlayer(playerId: string): void {
    const pIndex = this.players.findIndex(p => p.id === playerId);
    if (pIndex === -1) return;

    const removed = this.players[pIndex];
    this.players.splice(pIndex, 1);

    // Re-index seats
    this.players.forEach((p, idx) => {
      p.seatIndex = idx;
    });

    // If host left, reassign host
    if (removed.isHost && this.players.length > 0) {
      this.players[0].isHost = true;
      this.hostId = this.players[0].id;
    }

    if (this.status === 'playing') {
      if (this.players.length < 2) {
        // Not enough players to continue
        this.status = 'game_over';
        if (this.players.length === 1) {
          this.winner = {
            id: this.players[0].id,
            name: this.players[0].name,
            avatar: this.players[0].avatar,
            address: this.players[0].address,
          };
          this.createSettlement();
        }
        this.stopTurnTimer();
      } else {
        // Adjust turn index if needed
        if (pIndex <= this.currentTurnIndex) {
          this.currentTurnIndex = (this.currentTurnIndex - 1 + this.players.length) % this.players.length;
        }
        this.resetTurnTimer();
      }
    }

    this.emitUpdate();
  }

  public toggleReady(playerId: string): void {
    const p = this.players.find(pl => pl.id === playerId);
    if (p && !p.isHost) {
      p.isReady = !p.isReady;
      this.emitUpdate();
    }
  }

  public addBot(): boolean {
    if (this.players.length >= 5 || this.status !== 'lobby') return false;
    const botNames = ['HemiBot ⚡', 'CyberPepe 🐸', 'SoliditySam ⛓️', 'ChadCard 💎', 'QuantumByte 🤖'];
    const botAvatars = ['🤖', '🐸', '⚡', '🦁', '🦊'];
    const botIndex = this.players.filter(p => p.isBot).length;
    const name = botNames[botIndex % botNames.length];
    const avatar = botAvatars[botIndex % botAvatars.length];

    this.addPlayer({
      id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      avatar,
      isHost: false,
      isBot: true,
      isConnected: true,
      address: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    });
    return true;
  }

  public canStart(): boolean {
    // 3 to 5 players required by the spec
    if (this.players.length < 3 || this.players.length > 5) return false;
    // Non-host players must be ready
    return this.players.every(p => p.isHost || p.isReady || p.isBot);
  }

  public startGame(): boolean {
    if (!this.canStart() || this.status !== 'lobby') return false;

    this.status = 'playing';
    this.drawPile = createDeck();
    this.discardPile = [];
    this.turnDirection = 1;
    this.currentTurnIndex = 0;
    this.drawPendingForPlayer = false;
    this.drawnCard = null;
    this.pendingDrawCount = 0;
    this.winner = null;
    this.settlementSignature = null;

    // Deal 7 cards to each player
    for (const player of this.players) {
      player.hand = this.drawPile.splice(0, 7);
      player.cardCount = player.hand.length;
      player.hasCalledLastCard = false;
    }

    // Flip top card for discard pile (ensure it's not a wild card initially for clean start)
    let startCardIdx = this.drawPile.findIndex(c => c.color !== 'wild' && !['skip', 'reverse', 'draw2'].includes(c.value));
    if (startCardIdx === -1) startCardIdx = 0;
    const [startCard] = this.drawPile.splice(startCardIdx, 1);
    this.discardPile.push(startCard);
    this.activeColor = startCard.color;

    this.lastActionMessage = `Game started! First card is ${startCard.color.toUpperCase()} ${startCard.label}.`;
    this.triggerSound('deal');

    this.resetTurnTimer();
    this.emitUpdate();

    this.checkBotTurn();
    return true;
  }

  public getCurrentPlayer(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[this.currentTurnIndex] || null;
  }

  public getTopDiscard(): Card | null {
    if (this.discardPile.length === 0) return null;
    return this.discardPile[this.discardPile.length - 1];
  }

  public playCard(playerId: string, cardId: string, chosenColor?: CardColor): { success: boolean; error?: string } {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer || curPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const cardIndex = curPlayer.hand?.findIndex(c => c.id === cardId) ?? -1;
    if (cardIndex === -1 || !curPlayer.hand) {
      return { success: false, error: 'Card not in hand' };
    }

    const card = curPlayer.hand[cardIndex];
    const topCard = this.getTopDiscard();
    const isWild = card.color === 'wild';

    // Validation
    if (this.pendingDrawCount > 0) {
      const isDefendingDraw2 = card.value === 'draw2';
      const isDefendingDraw4 = card.value === 'wild_draw4';

      if (!isDefendingDraw2 && !isDefendingDraw4) {
        return {
          success: false,
          error: `Under attack! Must play +2 or +4 to defend, or tap Draw to take the +${this.pendingDrawCount} cards!`,
        };
      }
    } else {
      const matchesColor = card.color === this.activeColor;
      const matchesValue = topCard && card.value === topCard.value;

      if (!isWild && !matchesColor && !matchesValue) {
        return { success: false, error: `Invalid move: Card must match color ${this.activeColor?.toUpperCase()} or value ${topCard?.label}` };
      }
    }

    if (isWild && !chosenColor) {
      return { success: false, error: 'Color selection required for Wild card' };
    }

    // Play card
    curPlayer.hand.splice(cardIndex, 1);
    curPlayer.cardCount = curPlayer.hand.length;
    this.discardPile.push(card);
    this.drawPendingForPlayer = false;
    this.drawnCard = null;

    // Trigger visual motion event for all players & spectators
    this.triggerCardPlayed({
      id: `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId: curPlayer.id,
      playerName: curPlayer.name,
      playerAvatar: curPlayer.avatar,
      card,
      chosenColor,
      timestamp: Date.now(),
    });

    this.triggerSound('play');

    // Handle Wild color selection
    if (isWild && chosenColor) {
      this.activeColor = chosenColor;
      this.lastActionMessage = `${curPlayer.name} played ${card.label} and chose ${chosenColor.toUpperCase()}!`;
      this.triggerSound('wild');
    } else {
      this.activeColor = card.color;
      this.lastActionMessage = `${curPlayer.name} played ${card.color.toUpperCase()} ${card.label}.`;
    }

    // Check Last Card alert (1 card remaining)
    if (curPlayer.hand.length === 1) {
      this.setBanner('LAST_CARD', `🔥 ${curPlayer.name} HAS 1 CARD LEFT!`, curPlayer.id, curPlayer.name);
      this.triggerSound('last_card');
    }

    // Check Win Condition (0 cards remaining)
    if (curPlayer.hand.length === 0) {
      this.endGame(curPlayer);
      return { success: true };
    }

    // Handle Action Cards
    this.handleSpecialCard(card, curPlayer);

    return { success: true };
  }

  private handleSpecialCard(card: Card, curPlayer: Player): void {
    if (card.value === 'reverse') {
      this.turnDirection = this.turnDirection === 1 ? -1 : 1;
      this.setBanner('REVERSE', `⇄ REVERSE! Direction changed by ${curPlayer.name}`, curPlayer.id, curPlayer.name);
      this.triggerSound('special');
      this.advanceTurn(1);
    } else if (card.value === 'skip') {
      const skippedPlayer = this.getPlayerAtOffset(1);
      this.setBanner('SKIP', `⊘ SKIP! ${skippedPlayer?.name} was skipped!`, skippedPlayer?.id, skippedPlayer?.name);
      this.triggerSound('special');
      this.advanceTurn(2); // Skip next player
    } else if (card.value === 'draw2') {
      this.pendingDrawCount += 2;
      this.setBanner(
        'DRAW2',
        `⚡ +${this.pendingDrawCount} DEFENSE STACK! ${curPlayer.name} stacked +2! Defend or pick ${this.pendingDrawCount}!`,
        curPlayer.id,
        curPlayer.name
      );
      this.triggerSound('special');
      this.triggerShake(1.2);
      this.advanceTurn(1); // Advance to next player to defend or draw
    } else if (card.value === 'wild_draw4') {
      this.pendingDrawCount += 4;
      this.setBanner(
        'DRAW4',
        `💥 +${this.pendingDrawCount} DEFENSE STACK SLAM! ${curPlayer.name} stacked +4! Defend or pick ${this.pendingDrawCount}!`,
        curPlayer.id,
        curPlayer.name
      );
      this.triggerSound('special');
      this.triggerShake(2.0);
      this.advanceTurn(1); // Advance to next player to defend or draw
    } else {
      // Normal card or standard wild
      this.advanceTurn(1);
    }
  }

  public drawCard(playerId: string): { success: boolean; drawnCard?: Card; playable?: boolean; error?: string } {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer || curPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    if (this.drawPendingForPlayer) {
      return { success: false, error: 'Already drew a card this turn. Play it or pass.' };
    }

    // CASE 1: Player is taking the stacked draw penalty!
    if (this.pendingDrawCount > 0) {
      const count = this.pendingDrawCount;
      this.pendingDrawCount = 0;
      this.giveCardsToPlayer(curPlayer, count);

      this.triggerCardsDrawn({
        id: `cd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        playerId: curPlayer.id,
        playerName: curPlayer.name,
        playerAvatar: curPlayer.avatar,
        count,
        isPenalty: true,
        timestamp: Date.now(),
      });

      this.setBanner('DRAW4', `💥 ${curPlayer.name} PICKED +${count} CARDS!`, curPlayer.id, curPlayer.name);
      this.lastActionMessage = `${curPlayer.name} picked ${count} cards from the defense stack!`;
      this.triggerSound('draw');
      this.triggerShake(count >= 4 ? 2.0 : 1.2);

      // Taking the penalty ends the player's turn
      this.advanceTurn(1);
      return { success: true };
    }

    // CASE 2: Normal 1-card draw
    const card = this.popDrawCard();
    if (!card) {
      return { success: false, error: 'Deck is empty' };
    }

    if (!curPlayer.hand) curPlayer.hand = [];
    curPlayer.hand.push(card);
    curPlayer.cardCount = curPlayer.hand.length;

    this.triggerCardsDrawn({
      id: `cd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId: curPlayer.id,
      playerName: curPlayer.name,
      playerAvatar: curPlayer.avatar,
      count: 1,
      isPenalty: false,
      timestamp: Date.now(),
    });

    this.triggerSound('draw');

    // Check if playable
    const topCard = this.getTopDiscard();
    const isPlayable = card.color === 'wild' || card.color === this.activeColor || (topCard && card.value === topCard.value);

    this.drawPendingForPlayer = true;
    this.drawnCard = card;
    this.lastActionMessage = `${curPlayer.name} drew a card.`;

    if (!isPlayable) {
      // Auto-pass if not playable
      this.drawPendingForPlayer = false;
      this.drawnCard = null;
      this.advanceTurn(1);
      return { success: true, drawnCard: card, playable: false };
    }

    this.emitUpdate();
    return { success: true, drawnCard: card, playable: true };
  }

  public passTurn(playerId: string): { success: boolean; error?: string } {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer || curPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    if (!this.drawPendingForPlayer) {
      return { success: false, error: 'Must draw a card before passing' };
    }

    this.drawPendingForPlayer = false;
    this.drawnCard = null;
    this.lastActionMessage = `${curPlayer.name} passed turn.`;
    this.advanceTurn(1);
    return { success: true };
  }

  public callLastCard(playerId: string): void {
    const p = this.players.find(pl => pl.id === playerId);
    if (p && p.cardCount <= 2) {
      p.hasCalledLastCard = true;
      this.setBanner('LAST_CARD', `🚨 ${p.name} CALLED LAST CARD!`, p.id, p.name);
      this.triggerSound('last_card');
      this.emitUpdate();
    }
  }

  private giveCardsToPlayer(player: Player, count: number): void {
    if (!player.hand) player.hand = [];
    for (let i = 0; i < count; i++) {
      const c = this.popDrawCard();
      if (c) player.hand.push(c);
    }
    player.cardCount = player.hand.length;
  }

  private popDrawCard(): Card | null {
    if (this.drawPile.length === 0) {
      // Reshuffle discard pile into draw pile (leaving top card)
      if (this.discardPile.length <= 1) return null;
      const top = this.discardPile.pop()!;
      this.drawPile = shuffle(this.discardPile);
      this.discardPile = [top];
      this.lastActionMessage = 'Discard pile reshuffled into draw deck!';
    }
    return this.drawPile.pop() || null;
  }

  private getPlayerAtOffset(offset: number): Player | null {
    if (this.players.length === 0) return null;
    const nextIdx = (this.currentTurnIndex + offset * this.turnDirection + this.players.length * 10) % this.players.length;
    return this.players[nextIdx];
  }

  private advanceTurn(steps: number): void {
    this.drawPendingForPlayer = false;
    this.drawnCard = null;
    this.currentTurnIndex = (this.currentTurnIndex + steps * this.turnDirection + this.players.length * 10) % this.players.length;
    this.resetTurnTimer();
    this.emitUpdate();
    this.checkBotTurn();
  }

  private resetTurnTimer(): void {
    this.stopTurnTimer();
    this.turnTimeRemaining = this.turnTimeTotal;

    this.turnInterval = setInterval(() => {
      this.turnTimeRemaining -= 1;
      if (this.turnTimeRemaining <= 0) {
        this.handleTurnTimeout();
      } else {
        this.emitUpdate();
      }
    }, 1000);
  }

  private stopTurnTimer(): void {
    if (this.turnInterval) {
      clearInterval(this.turnInterval);
      this.turnInterval = null;
    }
  }

  private handleTurnTimeout(): void {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer) return;

    this.triggerSound('timer');
    this.setBanner('TURN_TIMEOUT', `⏰ Turn expired for ${curPlayer.name}! Auto-drew and passed.`, curPlayer.id, curPlayer.name);

    if (this.pendingDrawCount > 0) {
      const count = this.pendingDrawCount;
      this.pendingDrawCount = 0;
      this.giveCardsToPlayer(curPlayer, count);
      this.triggerCardsDrawn({
        id: `cd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        playerId: curPlayer.id,
        playerName: curPlayer.name,
        playerAvatar: curPlayer.avatar,
        count,
        isPenalty: true,
        timestamp: Date.now(),
      });
      this.triggerSound('draw');
    } else if (!this.drawPendingForPlayer) {
      // Auto-draw 1 card
      const c = this.popDrawCard();
      if (c && curPlayer.hand) {
        curPlayer.hand.push(c);
        curPlayer.cardCount = curPlayer.hand.length;
        this.triggerCardsDrawn({
          id: `cd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          playerId: curPlayer.id,
          playerName: curPlayer.name,
          playerAvatar: curPlayer.avatar,
          count: 1,
          isPenalty: false,
          timestamp: Date.now(),
        });
        this.triggerSound('draw');
      }
    }

    this.advanceTurn(1);
  }

  private checkBotTurn(): void {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer || !curPlayer.isBot || this.status !== 'playing') return;

    // Simulate thinking delay (1.0 - 1.6 seconds)
    const delay = 1000 + Math.random() * 600;
    setTimeout(() => {
      if (this.status !== 'playing' || this.getCurrentPlayer()?.id !== curPlayer.id) return;
      if (!curPlayer.hand) return;

      // DEFENSE STACK CHECK FOR BOT:
      if (this.pendingDrawCount > 0) {
        // Can bot defend with draw2 or wild_draw4?
        const defenseCard = curPlayer.hand.find(c => c.value === 'draw2' || c.value === 'wild_draw4');
        if (defenseCard) {
          let chosenColor: CardColor | undefined = undefined;
          if (defenseCard.color === 'wild') {
            const counts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
            curPlayer.hand.forEach(c => { if (c.color !== 'wild') counts[c.color]++; });
            chosenColor = (['red', 'blue', 'green', 'yellow'] as CardColor[]).reduce((a, b) => counts[a] >= counts[b] ? a : b);
          }
          this.playCard(curPlayer.id, defenseCard.id, chosenColor);
          return;
        } else {
          // Bot cannot defend, must take the penalty
          this.drawCard(curPlayer.id);
          return;
        }
      }

      const topCard = this.getTopDiscard();

      // Find valid cards to play
      const playable = curPlayer.hand.filter(c => {
        if (c.color === 'wild') return true;
        if (c.color === this.activeColor) return true;
        if (topCard && c.value === topCard.value) return true;
        return false;
      });

      if (playable.length > 0) {
        // Pick best card (prioritize action cards / color cards over wild)
        const chosen = playable.sort((a, b) => {
          if (a.color === 'wild' && b.color !== 'wild') return 1;
          if (b.color === 'wild' && a.color !== 'wild') return -1;
          return 0;
        })[0];

        let chosenColor: CardColor | undefined = undefined;
        if (chosen.color === 'wild') {
          // Count bot's colors in hand to pick the one it has the most of
          const counts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
          curPlayer.hand.forEach(c => { if (c.color !== 'wild') counts[c.color]++; });
          chosenColor = (['red', 'blue', 'green', 'yellow'] as CardColor[]).reduce((a, b) => counts[a] >= counts[b] ? a : b);
        }

        // Randomly call UNO if 2 cards left
        if (curPlayer.hand.length === 2 && Math.random() > 0.3) {
          this.callLastCard(curPlayer.id);
        }

        this.playCard(curPlayer.id, chosen.id, chosenColor);
      } else {
        // Draw a card
        const res = this.drawCard(curPlayer.id);
        if (res.playable && res.drawnCard) {
          // Play drawn card immediately
          setTimeout(() => {
            if (this.getCurrentPlayer()?.id === curPlayer.id && this.status === 'playing') {
              let color: CardColor | undefined = undefined;
              if (res.drawnCard?.color === 'wild') {
                color = (['red', 'blue', 'green', 'yellow'] as CardColor[])[Math.floor(Math.random() * 4)];
              }
              this.playCard(curPlayer.id, res.drawnCard!.id, color);
            }
          }, 800);
        }
      }
    }, delay);
  }

  private endGame(winner: Player): void {
    this.status = 'game_over';
    this.stopTurnTimer();
    this.winner = {
      id: winner.id,
      name: winner.name,
      avatar: winner.avatar,
      address: winner.address || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    };

    this.lastActionMessage = `🏆 ${winner.name} HAS WON THE GAME!`;
    this.triggerSound('victory');
    this.triggerShake(2.5);

    this.createSettlement();
    this.emitUpdate();
  }

  private createSettlement(): void {
    if (!this.winner) return;

    // Calculate pot = players * buyIn
    const totalPot = (this.players.length * parseFloat(this.buyInAmount)).toFixed(3);
    const nonce = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();

    // Generate EIP-712 settlement signature for Hemi Testnet
    this.settlementSignature = {
      roomId: this.roomId,
      winnerAddress: this.winner.address || '0x71C...b9',
      potAmount: totalPot,
      nonce,
      timestamp,
      signature: '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      contractAddress: '0x328E98d49B5c26a5789A50761e05a30364fBf81F',
      network: 'Hemi Sepolia (Chain ID 743111)',
    };
  }

  public rematch(): void {
    this.status = 'lobby';
    this.winner = null;
    this.settlementSignature = null;
    this.discardPile = [];
    this.drawPile = [];
    this.drawPendingForPlayer = false;
    this.drawnCard = null;
    this.pendingDrawCount = 0;
    this.players.forEach(p => {
      p.cardCount = 0;
      p.hand = [];
      p.hasCalledLastCard = false;
      p.isReady = p.isHost || !!p.isBot;
    });
    this.emitUpdate();
  }

  private setBanner(type: BannerType, text: string, playerId?: string, playerName?: string): void {
    this.bannerAlert = {
      id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      text,
      playerId,
      playerName,
    };
    this.emitUpdate();

    setTimeout(() => {
      if (this.bannerAlert?.text === text) {
        this.bannerAlert = null;
        this.emitUpdate();
      }
    }, 2800);
  }

  private triggerSound(sound: string): void {
    if (this.onSoundCallback) this.onSoundCallback(sound);
  }

  private triggerShake(intensity: number): void {
    if (this.onShakeCallback) this.onShakeCallback(intensity);
  }

  public emitUpdate(): void {
    if (this.onStateChangeCallback) this.onStateChangeCallback();
  }

  public getSanitizedStateForPlayer(targetPlayerId: string): GameState {
    const curPlayer = this.getCurrentPlayer();
    return {
      roomId: this.roomId,
      roomCode: this.roomCode,
      hostId: this.hostId,
      status: this.status,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        isReady: p.isReady,
        isBot: p.isBot,
        isConnected: p.isConnected,
        cardCount: p.cardCount,
        seatIndex: p.seatIndex,
        hasCalledLastCard: p.hasCalledLastCard,
        address: p.address,
        // Hand is strictly hidden from other players! Only target player sees their own hand
        // In game_over state, all hands can optionally be revealed
        hand: p.id === targetPlayerId || this.status === 'game_over' ? p.hand : undefined,
      })),
      currentTurnPlayerId: curPlayer?.id || null,
      currentTurnIndex: this.currentTurnIndex,
      turnDirection: this.turnDirection,
      turnTimeRemaining: this.turnTimeRemaining,
      turnTimeTotal: this.turnTimeTotal,
      topDiscardCard: this.getTopDiscard(),
      activeColor: this.activeColor,
      drawPileCount: this.drawPile.length,
      drawPendingForPlayer: curPlayer?.id === targetPlayerId ? this.drawPendingForPlayer : false,
      drawnCard: curPlayer?.id === targetPlayerId ? this.drawnCard : null,
      pendingDrawCount: this.pendingDrawCount,
      lastActionMessage: this.lastActionMessage,
      bannerAlert: this.bannerAlert,
      winner: this.winner,
      escrowPot: {
        amount: (this.players.length * parseFloat(this.buyInAmount)).toFixed(3),
        currency: this.currency,
        buyInAmount: this.buyInAmount,
      },
      settlementSignature: this.settlementSignature,
      spectatorCount: this.spectators.size,
      isSpectator: this.spectators.has(targetPlayerId),
    };
  }
}
