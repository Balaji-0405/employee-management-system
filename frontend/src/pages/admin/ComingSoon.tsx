import { PageBody, PageHeader } from "../../components/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Clock } from "lucide-react";

interface ComingSoonProps {
  title: string;
}

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <>
      <PageHeader title={title} description="This module is under development." />
      <PageBody>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <Clock className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              Coming Soon — This module is under development and will be available soon.
            </p>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
