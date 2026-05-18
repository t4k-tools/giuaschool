import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SectionHubItem = {
  href: string;
  title: string;
  description: string;
  badge?: string;
};

type SectionHubAction = {
  href: string;
  label: string;
};

type SectionHubProps = {
  eyebrow?: string;
  title: string;
  description: string;
  items: SectionHubItem[];
  quickActions?: SectionHubAction[];
};

export function SectionHub({
  eyebrow,
  title,
  description,
  items,
  quickActions = [],
}: SectionHubProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? <Badge variant="secondary">{eyebrow}</Badge> : null}
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="max-w-3xl text-muted-foreground">{description}</p>
        </div>

        {quickActions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button key={action.href} asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.href} className="justify-between">
            <CardHeader>
              {item.badge ? <Badge variant="outline" className="w-fit">{item.badge}</Badge> : null}
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href={item.href}>
                  Apri sezione
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
