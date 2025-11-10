import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { SIGN_ITEMS } from '@/lib/tegn/signData';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';

const SignIndexPage = () => {
  const { tCommon } = useTranslation();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SIGN_ITEMS;
    return SIGN_ITEMS.filter((item) => item.word.toLowerCase().includes(q));
  }, [query]);

  return (
    <section className="space-y-6">
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardContent className="p-6 space-y-2">
          <h2 className="text-xl font-semibold">{String(tCommon('tegn.tegnbase'))}</h2>
          <p className="text-sm text-muted-foreground">{String(tCommon('tegn.tegnbaseDesc'))}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <label htmlFor="sign-search" className="text-sm text-foreground">
          {String(tCommon('tegn.searchLabel'))}
        </label>
        <Input
          id="sign-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={String(tCommon('tegn.searchPlaceholder'))}
          aria-describedby="sign-search-status"
        />
        <div id="sign-search-status" role="status" aria-live="polite" className="sr-only">
          {String(tCommon('tegn.resultsCount', { count: filtered.length }))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filtered.map((sign) => (
          <figure key={sign.id} className="glass-card rounded-2xl p-3 border border-primary/10">
            <img
              src={sign.imageUrl}
              alt={sign.alt}
              className="w-full h-28 object-contain"
              loading="lazy"
            />
            <figcaption className="mt-2 text-sm text-center text-foreground">
              {sign.word}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

export default SignIndexPage;
