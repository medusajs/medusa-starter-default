import { Container, Skeleton } from "@medusajs/ui"

interface SingleColumnPageSkeletonProps {
  sections?: number
  showJSON?: boolean
  showMetadata?: boolean
}

export const SingleColumnPageSkeleton = ({
  sections = 2,
  showJSON = false,
  showMetadata = false,
}: SingleColumnPageSkeletonProps) => {
  return (
    <Container>
      <div className="flex flex-col gap-y-3">
        {Array.from({ length: sections }).map((_, i) => (
          <div key={i} className="flex flex-col gap-y-3">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}