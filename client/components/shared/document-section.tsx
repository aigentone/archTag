// src/components/shared/document-section.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DocumentSectionProps {
  title: string
  content: string | string[] | React.ReactNode
}

export function DocumentSection({ title, content }: DocumentSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {typeof content === 'string' ? (
          <p className="text-muted-foreground">{content}</p>
        ) : Array.isArray(content) ? (
          <div className="space-y-4">
            {content.map((item, index) => (
              <p key={index} className="text-muted-foreground">{item}</p>
            ))}
          </div>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  )
}