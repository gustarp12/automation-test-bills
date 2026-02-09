"use client";

import dynamic from "next/dynamic";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function SwaggerViewer() {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-lg shadow-slate-950/40">
      <SwaggerUI url="/api/openapi" docExpansion="list" deepLinking />
    </div>
  );
}
