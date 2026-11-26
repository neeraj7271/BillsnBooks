import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Select, Badge } from '@platform/ui';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Map Columns to Canonical Schema</CardTitle>
        <CardDescription>
          Align detected spreadsheet headers with standard Indian double-entry fields.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl border border-default overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-sunken border-b border-default font-semibold text-muted">
              <tr>
                <th className="py-2.5 px-4">Uploaded File Header</th>
                <th className="py-2.5 px-4">Canonical Platform Field</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {detectedHeaders.map((header) => {
                const mappedVal = mapping[header] || '';
                return (
                  <tr key={header}>
                    <td className="py-3 px-4 font-mono font-semibold text-primary">
                      {header}
                    </td>
                    <td className="py-3 px-4">
                      <Select
                        size="sm"
                        value={mappedVal}
                        onValueChange={(val) => onMappingChange(header, val)}
                        options={canonicalOptions}
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {mappedVal ? (
                        <Badge variant="success" size="xs">Mapped</Badge>
                      ) : (
                        <Badge variant="neutral" size="xs">Ignored</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

