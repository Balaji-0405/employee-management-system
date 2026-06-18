import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { PageBody, PageHeader } from "../../components/page-header";
import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} actions={<Button asChild><Link to="/dashboard">Back to dashboard</Link></Button>} />
      <PageBody>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>This section is being prepared in the manager panel.</p>
            <p>For now, you can navigate to the dashboard, projects, attendance, and payroll pages from the sidebar.</p>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
