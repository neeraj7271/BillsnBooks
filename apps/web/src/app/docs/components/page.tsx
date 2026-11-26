'use client';

import React from 'react';
import { PageHeader, Badge, PrimitivesCatalogue } from '@platform/ui';

export default function ComponentsDocsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="UI Component Catalogue"
        subtitle="Semantic-token primitives, typography scale, density modes, and accounting formatters."
        badge={<Badge variant="brand" size="sm">@platform/ui</Badge>}
      />
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <PrimitivesCatalogue />
      </div>
    </div>
  );
}
