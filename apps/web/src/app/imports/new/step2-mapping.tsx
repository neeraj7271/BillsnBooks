import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Select,
  Badge,
  DataTable,
  ColumnDef,
} from '@platform/ui';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { CANONICAL_IMPORT_FIELDS } from '@platform/shared-types';

interface Step2MappingProps {
  detectedHeaders: string[];
  mapping: Record<string, string>;
  mappingSaving: boolean;
  onMappingChange: (header: string, canonicalField: string) => void;
  onBack: () => void;
  onSaveMapping: () => void;
}

export function Step2Mapping({
  detectedHeaders,
  mapping,
  mappingSaving,
  onMappingChange,
  onBack,
  onSaveMapping,
}: Step2MappingProps) {
  const canonicalOptions = [
    { label: '-- Do Not Map (Ignore) --', value: '' },
    ...CANONICAL_IMPORT_FIELDS.map((f: any) => ({
      label: `${f.label} (${f.required ? 'Required' : 'Optional'})`,
      value: f.key,
    })),
  ];

  const mappingColumns: ColumnDef<{ header: string }>[] = [
    {
      key: 'header',
      header: 'Uploaded File Header',
      cell: (row) => (
        <span className="font-mono font-semibold text-primary">{row.header}</span>
      ),
    },
    {
      key: 'canonicalField',
      header: 'Canonical Platform Field',
      cell: (row) => (
        <div className="min-w-[260px]">
          <Select
            size="sm"
            className="w-full min-w-0"
            value={mapping[row.header] || ''}
            onValueChange={(val) => onMappingChange(row.header, val)}
            options={canonicalOptions}
          />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (row) =>
        mapping[row.header] ? (
          <Badge variant="success" size="xs">
            Mapped
          </Badge>
        ) : (
          <Badge variant="neutral" size="xs">
            Ignored
          </Badge>
        ),
    },
  ];

  const tableData = detectedHeaders.map((header) => ({ header }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Map Columns to Canonical Schema</CardTitle>
        <CardDescription>
          Align detected spreadsheet headers with standard Indian double-entry fields.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <DataTable
          columns={mappingColumns}
          data={tableData}
          showPagination={false}
          density="compact"
          emptyTitle="No headers detected"
          emptyDescription="Please upload a valid CSV or Excel file with header rows."
        />
      </CardContent>

      <CardFooter className="justify-between">
        <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
          Back to Upload
        </Button>
        <Button
          variant="primary"
          size="md"
          loading={mappingSaving}
          onClick={onSaveMapping}
          leftIcon={<Sparkles className="h-4 w-4" />}
        >
          Validate Staged Batch
        </Button>
      </CardFooter>
    </Card>
  );
}

