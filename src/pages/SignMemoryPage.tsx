import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { SIGN_ITEMS } from '@/lib/tegn/signData';
import { useEffect, useMemo, useState } from 'react';
import { useTegnXP } from '@/contexts/TegnXPContext';
import { cn } from '@/lib/utils';

type CardType = 'sign' | 'text';

interface MemoryCard {
  id: string;
  pairKey: string; // shared word
  type: CardType;
  imageUrl?: string;
  revealed: boolean;
  matched: boolean;
}

const PAIRS = 6;
const MATCH_XP = 2;
const BONUS_XP = 10;

const SignMemoryPage = () => {
  const { tCommon } = useTranslation();
  const { addXP } = useTegnXP();
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndexes, setFlippedIndexes] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [pairsFound, setPairsFound] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const basePool = useMemo(() => SIGN_ITEMS.slice(0), []);

  const setupGame = () => {
    setGameOver(false);
    setMoves(0);
    setPairsFound(0);
    setFlippedIndexes([]);
    // pick random PAIRS distinct signs
    const shuffled = [...basePool].sort(() => Math.random() - 0.5).slice(0, PAIRS);
    const newCards: MemoryCard[] = [];
    shuffled.forEach((sign) => {
      newCards.push({
        id: `${sign.id}-img`,
        pairKey: sign.word,
        type: 'sign',
        imageUrl: sign.imageUrl,
        revealed: false,
        matched: false,
      });
      newCards.push({
        id: `${sign.id}-txt`,
        pairKey: sign.word,
        type: 'text',
        revealed: false,
        matched: false,
      });
    });
    // shuffle cards
    const mixed = newCards.sort(() => Math.random() - 0.5);
    setCards(mixed);
  };

  useEffect(() => {
    setupGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pairsFound === PAIRS && PAIRS > 0) {
      setGameOver(true);
      addXP(BONUS_XP);
    }
  }, [pairsFound, addXP]);

  const handleFlip = (idx: number) => {
    if (gameOver) return;
    setCards((prev) => {
      const c = prev[idx];
      if (c.revealed || c.matched) return prev;
      const next = [...prev];
      next[idx] = { ...c, revealed: true };
      return next;
    });
    setFlippedIndexes((prev) => {
      const next = [...prev, idx];
      if (next.length === 2) {
        setMoves((m) => m + 1);
        // check match after short delay to allow UI render
        setTimeout(() => {
          setCards((curr) => {
            const [a, b] = next;
            const ca = curr[a];
            const cb = curr[b];
            if (!ca || !cb) return curr;
            if (ca.pairKey === cb.pairKey && ca.type !== cb.type) {
              // match
              addXP(MATCH_XP);
              const updated = curr.map((card, i) =>
                i === a || i === b ? { ...card, matched: true } : card,
              );
              setPairsFound((p) => p + 1);
              return updated;
            } else {
              // flip back
              const updated = curr.map((card, i) =>
                i === a || i === b ? { ...card, revealed: false } : card,
              );
              return updated;
            }
          });
          setFlippedIndexes([]);
        }, 650);
      }
      return next;
    });
  };

  return (
    <section className="space-y-6">
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardContent className="p-6 space-y-2">
          <h2 className="text-xl font-semibold">{String(tCommon('tegn.memory'))}</h2>
          <p className="text-sm text-muted-foreground">{String(tCommon('tegn.memoryDesc'))}</p>
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              {String(tCommon('tegn.moves'))}: {moves}
            </span>
            <span>{String(tCommon('tegn.pairsFound', { count: pairsFound }))}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={setupGame}>
              {String(tCommon('tegn.resetGame'))}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const isFaceUp = card.revealed || card.matched;
          const aria = !isFaceUp
            ? tCommon('tegn.hiddenCard')
            : card.type === 'sign'
              ? tCommon('tegn.signCardAria', { word: card.pairKey })
              : tCommon('tegn.textCardAria', { word: card.pairKey });
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(idx)}
              className={cn(
                'relative aspect-[3/4] rounded-xl border border-border overflow-hidden transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isFaceUp ? 'bg-background' : 'bg-muted/60 hover:scale-[1.02]',
              )}
              aria-label={aria}
            >
              {isFaceUp ? (
                card.type === 'sign' ? (
                  <img
                    src={card.imageUrl}
                    alt={card.pairKey}
                    className="w-full h-full object-contain p-3"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-foreground">
                    {card.pairKey}
                  </div>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground">
                  ?
                </div>
              )}
              {card.matched && (
                <div
                  className="absolute inset-0 ring-2 ring-success/70 rounded-xl pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {gameOver && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6 space-y-3">
            <div className="text-lg text-foreground">
              {String(tCommon('tegn.gameComplete', { bonus: BONUS_XP }))}
            </div>
            <Button onClick={setupGame}>{String(tCommon('tegn.memoryPlayAgain'))}</Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default SignMemoryPage;
