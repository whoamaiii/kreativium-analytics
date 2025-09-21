import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, FlaskConical, Plus } from 'lucide-react';
import { POC_MODE } from '@/lib/env';
import { MockDataLoader } from '@/components/MockDataLoader';

interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
  sampleTitle: string;
  sampleDesc: string;
  sampleButton: string;
  sampleDialogTitle: string;
  sampleDialogDesc: string;
}

export const EmptyState = ({ title, description, ctaLabel, onCta, sampleTitle, sampleDesc, sampleButton, sampleDialogTitle, sampleDialogDesc }: EmptyStateProps) => {
  return (
    <div className="space-y-8 animate-fade-in" data-animation-delay="0.7s">
      <div className="relative glass-card rounded-3xl p-8 text-center min-h-[400px] flex flex-col justify-center items-center overflow-hidden">
        <div className="absolute top-10 right-10 opacity-10 transition-transform duration-500 hover:scale-110">
          <svg fill="none" height="100" viewBox="0 0 24 24" width="100" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.5 12C16.5 14.4853 14.4853 16.5 12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12Z" stroke="hsl(var(--primary))" strokeWidth="1.5"></path>
            <path d="M19.5 17.5714C19.5 19.961 17.2687 21.5 15.4286 21.5C13.5884 21.5 11.8333 20.3571 10.7143 19.2857M4.5 17.5714C4.5 19.961 6.73134 21.5 8.57143 21.5C10.4116 21.5 12.1667 20.3571 13.2857 19.2857M13.2857 19.2857C14.0714 18.5 14.0714 17.2143 13.2857 16.4286M10.7143 19.2857C9.92857 18.5 9.92857 17.2143 10.7143 16.4286M13.2857 16.4286C12.5 15.6429 11.5 15.6429 10.7143 16.4286M12 7.5C10.7143 4.5 8.57143 2.5 6 2.5M12 7.5C13.2857 4.5 15.4286 2.5 18 2.5" stroke="hsl(var(--primary))" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
          </svg>
        </div>
        <div className="absolute bottom-10 left-10 opacity-5 -rotate-12 transition-transform duration-500 hover:scale-110 hover:-rotate-6">
          <svg fill="none" height="120" viewBox="0 0 24 24" width="120" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.5 12C16.5 14.4853 14.4853 16.5 12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12Z" stroke="hsl(var(--primary))" strokeWidth="1.5"></path>
            <path d="M19.5 17.5714C19.5 19.961 17.2687 21.5 15.4286 21.5C13.5884 21.5 11.8333 20.3571 10.7143 19.2857M4.5 17.5714C4.5 19.961 6.73134 21.5 8.57143 21.5C10.4116 21.5 12.1667 20.3571 13.2857 19.2857M13.2857 19.2857C14.0714 18.5 14.0714 17.2143 13.2857 16.4286M10.7143 19.2857C9.92857 18.5 9.92857 17.2143 10.7143 16.4286M13.2857 16.4286C12.5 15.6429 11.5 15.6429 10.7143 16.4286M12 7.5C10.7143 4.5 8.57143 2.5 6 2.5M12 7.5C13.2857 4.5 15.4286 2.5 18 2.5" stroke="hsl(var(--primary))" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-6 border border-primary/20 transition-transform duration-300 hover:scale-110">
            <Users className="text-primary h-12 w-12 transition-transform duration-300 group-hover:rotate-6" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground">{title}</h3>
          <p className="mt-3 max-w-md text-base text-muted-foreground">{description}</p>
          <Button variant="default" onClick={onCta} size="lg" className="mt-8 flex items-center justify-center group">
            <Plus className="mr-2 h-4 w-4 group-hover:animate-bounce transition-transform" />
            {ctaLabel}
          </Button>
        </div>
      </div>

      {POC_MODE && (
        <Card className="mt-8 bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h4 className="text-lg font-semibold text-foreground">{sampleTitle}</h4>
              <p className="text-sm text-muted-foreground mt-1">{sampleDesc}</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <FlaskConical className="h-4 w-4 mr-2" />
                  {sampleButton}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{sampleDialogTitle}</DialogTitle>
                  <DialogDescription>{sampleDialogDesc}</DialogDescription>
                </DialogHeader>
                <MockDataLoader />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
};



