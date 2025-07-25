import { 
  Container, 
  Heading, 
  Text, 
  Button, 
  Textarea,
  Badge,
  Avatar,
  toast,
  Switch
} from "@medusajs/ui"
import { ChatBubble, MapPin, EllipsisHorizontal, ArrowUturnLeft, PencilSquare, Trash, Clock, Tools, User } from "@medusajs/icons"
import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatRelativeTime } from "../utils/format-time"

interface ServiceOrderComment {
  id: string
  service_order_id: string
  message: string
  author_id: string
  author_type: "user" | "technician" | "customer" | "system"
  author_name: string
  parent_comment_id?: string | null
  is_internal: boolean
  is_pinned: boolean
  attachments?: any
  mentions?: any
  is_edited: boolean
  edited_at?: string | null
  created_at: string
  updated_at: string
  replies?: ServiceOrderComment[]
  metadata?: {
    event_type?: string
    event_data?: {
      groupedEvents?: any[]
      eventCount?: number
    }
  }
}

interface ServiceOrderCommentsWidgetProps {
  data: {
    id: string
    service_order_number: string
  }
}

// Comment Form Component
const CommentForm = ({ 
  serviceOrderId, 
  onSuccess, 
  parentId = null, 
  initialValue = "",
  onCancel 
}: {
  serviceOrderId: string
  onSuccess: () => void
  parentId?: string | null
  initialValue?: string
  onCancel?: () => void
}) => {
  const [message, setMessage] = useState(initialValue)
  const [isInternal, setIsInternal] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  const createCommentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/admin/service-orders/${serviceOrderId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to create comment')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-order-comments', serviceOrderId] })
      setMessage("")
      toast.success(parentId ? "Reply posted successfully" : "Comment posted successfully")
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(`Failed to post comment: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    createCommentMutation.mutate({
      message: message.trim(),
      author_id: "current-user", // TODO: Get from auth context
      author_name: "Current User", // TODO: Get from auth context
      author_type: "user",
      parent_comment_id: parentId,
      is_internal: isInternal
    })
  }

  const handleResize = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = textarea.scrollHeight + "px"
    }
  }

  useEffect(() => {
    handleResize()
  }, [message])

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={parentId ? "Write a reply..." : "Add a comment..."}
          rows={3}
          className="resize-none"
          onInput={handleResize}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded"
            />
            Internal comment
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="secondary" 
              size="small"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            size="small"
            disabled={!message.trim() || createCommentMutation.isPending}
          >
            {createCommentMutation.isPending ? "Posting..." : (parentId ? "Reply" : "Comment")}
          </Button>
        </div>
      </div>
    </form>
  )
}

// Event Icon Component
const EventIcon = ({ eventType }: { eventType?: string }) => {
  switch (eventType) {
    case 'part_added':
    case 'part_removed':
    case 'parts_batch':
      return <Tools className="h-4 w-4 text-ui-tag-neutral-icon" />
    case 'time_entry_added':
    case 'time_entries_batch':
      return <Clock className="h-4 w-4 text-ui-tag-blue-icon" />
    case 'status_changed':
      return <EllipsisHorizontal className="h-4 w-4 text-ui-tag-green-icon" />
    case 'technician_assigned':
      return <User className="h-4 w-4 text-ui-tag-purple-icon" />
    default:
      return <EllipsisHorizontal className="h-4 w-4 text-ui-tag-neutral-icon" />
  }
}

// Event Message Component
const EventMessage = ({ comment }: { comment: ServiceOrderComment }) => {
  if (comment.author_type !== 'system') return null
  
  const eventType = comment.metadata?.event_type
  const eventData = comment.metadata?.event_data
  
  return (
    <div className="flex items-start gap-3 py-3 px-4 bg-ui-bg-subtle rounded-lg border-l-4 border-ui-tag-neutral-border">
      <div className="flex-shrink-0 mt-0.5">
        <EventIcon eventType={eventType} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Text size="small" className="font-medium text-ui-fg-base">
            System Event
          </Text>
          <Badge size="2xsmall" color="grey">
            {eventType?.replace('_', ' ') || 'activity'}
          </Badge>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {formatRelativeTime(comment.created_at)}
          </Text>
        </div>
        <Text size="small" className="text-ui-fg-base">
          {comment.message}
        </Text>
        
        {/* Show grouped events details if available */}
        {eventData?.groupedEvents && (
          <details className="mt-2">
            <summary className="text-xs text-ui-fg-subtle cursor-pointer hover:text-ui-fg-base">
              View {eventData.eventCount} individual actions
            </summary>
            <div className="mt-2 space-y-1 pl-4 border-l border-ui-border-base">
              {eventData.groupedEvents.map((event: any, index: number) => (
                <Text key={index} size="xsmall" className="text-ui-fg-subtle block">
                  • {event.data?.title || event.data?.description || event.type}
                </Text>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// Updated Comment Item Component
const CommentItem = ({ 
  comment, 
  serviceOrderId, 
  onReply 
}: { 
  comment: ServiceOrderComment
  serviceOrderId: string
  onReply: (commentId: string) => void
}) => {
  // If this is a system event, render as event
  if (comment.author_type === 'system') {
    return <EventMessage comment={comment} />
  }

  // Existing comment rendering logic
  const [isEditing, setIsEditing] = useState(false)
  const [editMessage, setEditMessage] = useState(comment.message)
  const queryClient = useQueryClient()

  const updateCommentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/admin/service-orders/${serviceOrderId}/comments/${comment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to update comment')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-order-comments', serviceOrderId] })
      setIsEditing(false)
      toast.success("Comment updated successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to update comment: ${error.message}`)
    }
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/admin/service-orders/${serviceOrderId}/comments/${comment.id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete comment')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-order-comments', serviceOrderId] })
      toast.success("Comment deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete comment: ${error.message}`)
    }
  })

  const handleEdit = () => {
    updateCommentMutation.mutate({ message: editMessage.trim() })
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate()
    }
  }

  const getAuthorColor = (authorType: string) => {
    switch (authorType) {
      case 'technician': return 'blue'
      case 'customer': return 'green'
      case 'system': return 'grey'
      default: return 'purple'
    }
  }

  return (
    <div className="group relative">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Avatar
            src={undefined}
            fallback={comment.author_name.substring(0, 2).toUpperCase()}
            size="small"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Text size="small" className="font-medium">
              {comment.author_name}
            </Text>
            <Badge size="2xsmall" color={
              comment.author_type === 'technician' ? 'blue' :
              comment.author_type === 'customer' ? 'green' : 'grey'
            }>
              {comment.author_type}
            </Badge>
            {comment.is_internal && (
              <Badge size="2xsmall" color="orange">
                Internal
              </Badge>
            )}
            <Text size="xsmall" className="text-ui-fg-subtle">
              {formatRelativeTime(comment.created_at)}
              {comment.is_edited && " (edited)"}
            </Text>
          </div>
          
          <div className="mb-2">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="small" onClick={handleEdit} disabled={updateCommentMutation.isPending}>
                    {updateCommentMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button size="small" variant="secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Text size="small" className="whitespace-pre-wrap">{comment.message}</Text>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="small"
              variant="transparent"
              onClick={() => onReply(comment.id)}
            >
              <ArrowUturnLeft className="h-4 w-4" />
            </Button>
            <Button
              size="small"
              variant="transparent"
              onClick={() => setIsEditing(true)}
            >
              <PencilSquare className="h-4 w-4" />
            </Button>
            <Button
              size="small"
              variant="transparent"
              onClick={handleDelete}
              disabled={deleteCommentMutation.isPending}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  serviceOrderId={serviceOrderId}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ServiceOrderCommentsWidget = ({ data: serviceOrder }: ServiceOrderCommentsWidgetProps) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [showEvents, setShowEvents] = useState(true)
  const [showComments, setShowComments] = useState(true)

  const { data: comments, isLoading } = useQuery({
    queryKey: ['service-order-comments', serviceOrder.id],
    queryFn: async () => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/comments?threaded=true`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      const data = await response.json()
      return data.comments || []
    },
    staleTime: 30000,
  })

  const handleReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId)
  }

  // Filter comments/events based on toggle states
  const filteredComments = comments?.filter((comment: ServiceOrderComment) => {
    if (comment.author_type === 'system') {
      return showEvents
    } else {
      return showComments
    }
  }) || []

  // Count events and comments separately
  const eventCount = comments?.filter((c: ServiceOrderComment) => c.author_type === 'system').length || 0
  const commentCount = comments?.filter((c: ServiceOrderComment) => c.author_type !== 'system').length || 0

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Activity & Comments</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-2">Loading activity...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ChatBubble className="h-5 w-5" />
            <Heading level="h2">Activity & Comments</Heading>
            <div className="flex gap-1">
              <Badge size="small" color="grey">{commentCount} comments</Badge>
              <Badge size="small" color="blue">{eventCount} events</Badge>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-ui-bg-subtle rounded-lg">
          <Text size="small" className="font-medium">Show:</Text>
          <div className="flex items-center gap-2">
            <Switch 
              checked={showComments} 
              onCheckedChange={setShowComments}
              id="show-comments"
            />
            <label htmlFor="show-comments" className="text-sm cursor-pointer">
              Comments ({commentCount})
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              checked={showEvents} 
              onCheckedChange={setShowEvents}
              id="show-events"
            />
            <label htmlFor="show-events" className="text-sm cursor-pointer">
              System Events ({eventCount})
            </label>
          </div>
        </div>
        
        {/* New Comment Form */}
        <CommentForm
          serviceOrderId={serviceOrder.id}
          onSuccess={() => {}}
        />
      </div>
      
      {/* Activity List */}
      <div className="px-6 py-4">
        {filteredComments.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle text-center py-8">
            {!showComments && !showEvents 
              ? "Enable comments or events to see activity"
              : "No activity yet. Be the first to add a comment!"
            }
          </Text>
        ) : (
          <div className="space-y-6">
            {filteredComments.map((comment: ServiceOrderComment) => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  serviceOrderId={serviceOrder.id}
                  onReply={handleReply}
                />
                
                {/* Reply Form */}
                {replyingTo === comment.id && comment.author_type !== 'system' && (
                  <div className="mt-4 ml-12">
                    <CommentForm
                      serviceOrderId={serviceOrder.id}
                      parentId={comment.id}
                      onSuccess={() => setReplyingTo(null)}
                      onCancel={() => setReplyingTo(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}

export default ServiceOrderCommentsWidget 