import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface JsonLdTableProps {
  data: Record<string, any>
}

export function JsonLdTable({ data }: JsonLdTableProps) {
  const renderValue = (value: any): React.ReactNode => {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map((item, index) => (
          <div key={index} className="py-1">
            {renderValue(item)}
          </div>
        ))
      }
      return <JsonLdTable data={value} />
    }
    return String(value)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Property</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(data).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell className="font-medium">{key}</TableCell>
              <TableCell>{renderValue(value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
