/**
 * Example Entries Showcase Component
 *
 * Displays sample tracking entries to help teachers understand
 * what good data entry looks like.
 *
 * Features:
 * - Real-world examples
 * - Different scenarios (positive, challenging, neutral)
 * - Annotations explaining why each is effective
 * - Copy-able templates
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Lightbulb } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ExampleEntry {
  id: string;
  title: string;
  scenario: string;
  emotion: string;
  intensity: number;
  sensory: Array<{ type: string; response: string }>;
  triggers?: string[];
  coping?: string[];
  notes: string;
  whatMakesItGood: string[];
}

const EXAMPLE_ENTRIES: ExampleEntry[] = [
  {
    id: 'transition-anxiety',
    title: 'Morning Arrival Anxiety',
    scenario: 'Student shows distress during morning transition to classroom',
    emotion: 'Anxious',
    intensity: 4,
    sensory: [
      { type: 'Auditory', response: 'Avoiding' },
      { type: 'Tactile', response: 'Seeking' }
    ],
    triggers: ['Loud hallway noise', 'Crowded entrance'],
    coping: ['Noise-canceling headphones', 'Arrived 5 min early tomorrow'],
    notes: 'Emma covered her ears when the bell rang and requested to hold her weighted stuffed animal. Calmed down after 10 minutes in quiet corner.',
    whatMakesItGood: [
      'Specific triggers identified (not just "transition")',
      'Successful coping strategy documented',
      'Timeline included (10 minutes to calm)',
      'Concrete next step (arrive early)'
    ]
  },
  {
    id: 'focused-learning',
    title: 'Engaged Learning State',
    scenario: 'Student showing optimal engagement during math',
    emotion: 'Calm',
    intensity: 4,
    sensory: [
      { type: 'Proprioceptive', response: 'Neutral' },
      { type: 'Visual', response: 'Seeking' }
    ],
    triggers: [],
    coping: [],
    notes: 'Used wobble cushion during independent work. Completed 15/15 problems correctly. Requested to continue working during break.',
    whatMakesItGood: [
      'Captured positive patterns (what works!)',
      'Noted environmental support (wobble cushion)',
      'Quantified success (15/15 problems)',
      'Shows intrinsic motivation'
    ]
  },
  {
    id: 'sensory-break',
    title: 'Effective Sensory Break',
    scenario: 'Proactive sensory regulation during afternoon',
    emotion: 'Calm',
    intensity: 3,
    sensory: [
      { type: 'Proprioceptive', response: 'Seeking' },
      { type: 'Vestibular', response: 'Seeking' }
    ],
    triggers: [],
    coping: ['Wall push-ups (10 reps)', 'Jumping jacks (20)', 'Deep pressure with therapy ball'],
    notes: 'Student self-advocated for sensory break at 2pm. Used sensory gym for 5 minutes. Returned to classroom ready to focus. No dysregulation noted afterward.',
    whatMakesItGood: [
      'Self-advocacy highlighted (important IEP goal)',
      'Specific activities documented (replicable)',
      'Duration tracked (efficient)',
      'Outcome measured (returned focused)'
    ]
  },
  {
    id: 'peer-conflict',
    title: 'Peer Conflict Response',
    scenario: 'Student dysregulated after disagreement with classmate',
    emotion: 'Angry',
    intensity: 5,
    sensory: [
      { type: 'Auditory', response: 'Overwhelmed' },
      { type: 'Tactile', response: 'Avoiding' }
    ],
    triggers: ['Lost game during recess', 'Peer teasing', 'Hot temperature outside'],
    coping: ['Cool-down walk with aide', 'Offered water', 'Used feelings chart to identify emotion'],
    notes: 'Initial outburst (yelling, stomping). Refused physical comfort. After 15-min walk, used words to express frustration. Apologized to peer with support. Back to baseline after lunch.',
    whatMakesItGood: [
      'Multiple triggers documented (cumulative effect)',
      'Progression tracked (escalation → regulation)',
      'What didn\'t work noted (physical comfort refused)',
      'Resolution included (apology with support)',
      'Return to baseline time documented'
    ]
  },
  {
    id: 'weather-correlation',
    title: 'Weather-Related Regulation',
    scenario: 'Student showing increased sensory seeking on rainy day',
    emotion: 'Excited',
    intensity: 3,
    sensory: [
      { type: 'Vestibular', response: 'Seeking' },
      { type: 'Proprioceptive', response: 'Seeking' }
    ],
    triggers: ['Indoor recess (rainy day)', 'Limited gross motor outlet'],
    coping: ['Brain break every 20 min', 'Chair push-ups at desk', 'Therapy band on chair legs'],
    notes: 'Student more fidgety than usual during indoor recess. Proactively offered movement breaks. Used therapy band independently 3x. No behavioral concerns, just increased need for movement.',
    whatMakesItGood: [
      'Environmental factor noted (weather)',
      'Cause-effect relationship clear',
      'Proactive accommodations documented',
      'Independent tool use tracked',
      'Clarified "no behavioral concern" (positive reframe)'
    ]
  }
];

export const ExampleEntries: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (entry: ExampleEntry) => {
    const text = `
Emotion: ${entry.emotion} (Intensity: ${entry.intensity}/5)
Sensory: ${entry.sensory.map(s => `${s.type}: ${s.response}`).join(', ')}
${entry.triggers && entry.triggers.length > 0 ? `Triggers: ${entry.triggers.join(', ')}` : ''}
${entry.coping && entry.coping.length > 0 ? `Coping: ${entry.coping.join(', ')}` : ''}
Notes: ${entry.notes}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);

    toast({
      title: 'Copied!',
      description: 'Example entry copied to clipboard',
      duration: 2000
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Example Tracking Entries
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-world examples of effective tracking. See what makes each entry useful for understanding student patterns.
        </p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue={EXAMPLE_ENTRIES[0].id} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 h-auto gap-2">
            {EXAMPLE_ENTRIES.slice(0, 3).map((entry) => (
              <TabsTrigger
                key={entry.id}
                value={entry.id}
                className="text-xs whitespace-normal h-auto py-2 px-3"
              >
                {entry.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {EXAMPLE_ENTRIES.map((entry) => (
            <TabsContent key={entry.id} value={entry.id} className="space-y-4 mt-4">
              {/* Scenario context */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground italic">
                  <span className="font-medium text-foreground">Scenario:</span> {entry.scenario}
                </p>
              </div>

              {/* Entry data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Emotion & Intensity</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        {entry.emotion}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {entry.intensity}/5
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Sensory Responses</h4>
                    <div className="flex flex-wrap gap-2">
                      {entry.sensory.map((s, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {s.type}: {s.response}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {entry.triggers && entry.triggers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Triggers</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {entry.triggers.map((trigger, idx) => (
                          <li key={idx}>• {trigger}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.coping && entry.coping.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Coping Strategies</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {entry.coping.map((strategy, idx) => (
                          <li key={idx}>• {strategy}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {entry.notes}
                    </p>
                  </div>
                </div>
              </div>

              {/* What makes it good */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="text-sm font-semibold mb-3 text-primary flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  What Makes This Entry Effective:
                </h4>
                <ul className="space-y-2">
                  {entry.whatMakesItGood.map((point, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Copy button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(entry)}
                  className="gap-2"
                >
                  {copiedId === entry.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy as Template
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Tips section */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Quick Tips for Better Entries</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• <span className="font-medium text-foreground">Be specific:</span> "Loud hallway bell" vs. "noise"</li>
            <li>• <span className="font-medium text-foreground">Note what works:</span> Don't just track problems, capture successes!</li>
            <li>• <span className="font-medium text-foreground">Include timelines:</span> "Calmed after 10 min" helps measure progress</li>
            <li>• <span className="font-medium text-foreground">Track self-advocacy:</span> When students request breaks, that's progress</li>
            <li>• <span className="font-medium text-foreground">Connect environment:</span> Weather, time of day, room setup all matter</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExampleEntries;
