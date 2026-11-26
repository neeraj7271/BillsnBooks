import { Button } from '../button';
import { Badge } from '../badge';
import { Input } from '../input';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Alert } from '../alert';
import { MoneyText } from '../money-text';
import { DateText } from '../date-text';
import { Progress } from '../progress';
import { Skeleton } from '../skeleton';
import { Switch } from '../switch';

export function PrimitivesCatalogue() {
  const sampleDate = '2026-11-25T10:00:00Z';
  return (
    <div className="space-y-8 p-6 bg-canvas text-primary">
      <section className="space-y-3">
        <h2 className="text-h2 text-primary">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>Loading</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-h2 text-primary">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-h2 text-primary">Inputs, Switches &amp; Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Enter GSTIN..." />
          <div className="flex items-center gap-3">
            <Switch checked onCheckedChange={() => {}} />
            <span className="text-body-sm text-secondary">Compact Mode</span>
          </div>
          <Progress value={68} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-h2 text-primary">MoneyText &amp; DateText</h2>
        <div className="flex flex-wrap gap-6 items-center">
          <MoneyText amount={125430.5} colorCode="profit-loss" />
          <MoneyText amount={-18400} negative />
          <MoneyText amount={42000} showDrCr colorCode="dr-cr" />
          <DateText date={sampleDate} variant="short" />
          <DateText date={sampleDate} variant="long" />
          <DateText date={sampleDate} variant="relative" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-h2 text-primary">Cards, Alerts &amp; Skeletons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Semantic Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Alert variant="default" title="Info">All tokens adapt cleanly across light/dark &amp; density.</Alert>
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
