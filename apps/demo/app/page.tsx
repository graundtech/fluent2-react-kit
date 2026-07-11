import { Hello, version } from "@graundtech/fluent2-react-kit";

export default function DemoPage() {
  return (
    <main className="demo-shell">
      <h1>Fluent 2 React Kit</h1>
      <p>
        <Hello name="Fluent 2" /> — starter scaffold (v{version}).
      </p>
      <p className="demo-muted">
        The component kit is being rebuilt from scratch. This demo exists to keep the
        Vercel release pipeline green. See <code>VERCEL_PIPELINE.md</code>.
      </p>
    </main>
  );
}
