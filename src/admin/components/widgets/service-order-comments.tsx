import {
  Container,
  Heading,
  Text,
  Button,
  Textarea,
  Badge,
  Avatar,
  toast,
  Tabs,
  Label
} from "@medusajs/ui"
import { ChatBubble, PencilSquare, Trash, ArrowUturnLeft } from "@medusajs/icons"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatRelativeTime } from "../../utils/format-time"

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
  onCancel
}: {
  serviceOrderId: string
  onSuccess: () => void
  parentId?: string | null
  onCancel?: () => void
}) => {
  const [message, setMessage] = useState("")
  const queryClient = useQueryClient()

  // Fetch current logged-in user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await fetch('/admin/users/me')
      if (!response.ok) throw new Error('Failed to fetch user')
      const data = await response.json()
      return data.user
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

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
      toast.success(parentId ? "Reply posted" : "Comment posted")
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(`Failed to post comment: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    const userName = currentUser
      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.email
      : 'Unknown User'

    createCommentMutation.mutate({
      message: message.trim(),
      author_id: currentUser?.id || "unknown",
      author_name: userName,
      author_type: "user",
      parent_comment_id: parentId,
      is_internal: false
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-y-2">
      <Textarea
        placeholder={parentId ? "Write a reply..." : "Add a comment..."}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />
      <div className="flex items-center justify-end gap-x-2">
        {onCancel && (
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          size="small"
          type="submit"
          disabled={!message.trim() || createCommentMutation.isPending}
        >
          {createCommentMutation.isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </form>
  )
}

// Event Message Component
const EventMessage = ({ comment }: { comment: ServiceOrderComment }) => {
  const getEventBadgeColor = (eventType?: string): "grey" | "blue" | "green" | "orange" | "purple" => {
    switch (eventType) {
      case 'status_change':
        return 'blue'
      case 'item_added':
        return 'green'
      case 'time_entry':
      case 'time_entry_started':
        return 'purple'
      case 'time_entry_stopped':
        return 'orange'
      default:
        return 'grey'
    }
  }

  const getEventLabel = (eventType?: string): string => {
    switch (eventType) {
      case 'time_entry_started':
        return 'timer started'
      case 'time_entry_stopped':
        return 'timer stopped'
      case 'status_change':
        return 'status change'
      case 'item_added':
        return 'item added'
      case 'time_entry':
        return 'time entry'
      default:
        return eventType?.replace('_', ' ') || 'event'
    }
  }

  return (
    <div className="flex items-start gap-x-3">
      <div className="flex-shrink-0 pt-0.5">
        <Badge size="2xsmall" color={getEventBadgeColor(comment.metadata?.event_type)}>
          {getEventLabel(comment.metadata?.event_type)}
        </Badge>
      </div>
      <div className="flex-1 min-w-0">
        <Text size="small" className="text-ui-fg-subtle">
          {comment.message}
        </Text>
        <Text size="xsmall" className="text-ui-fg-muted">
          {formatRelativeTime(comment.created_at)}
        </Text>
      </div>
    </div>
  )
}

// Comment Item Component
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
      toast.success("Comment updated")
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`)
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
      toast.success("Comment deleted")
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`)
    }
  })

  const handleEdit = () => {
    if (!editMessage.trim()) return
    updateCommentMutation.mutate({ message: editMessage.trim() })
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate()
    }
  }

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-start gap-x-3">
        <div className="flex-shrink-0">
          <Avatar
            src={undefined}
            fallback={comment.author_name.substring(0, 2).toUpperCase()}
            size="small"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Text size="small" weight="plus">
              {comment.author_name}
            </Text>
            {comment.is_internal && (
              <Badge size="2xsmall" color="orange">
                Internal
              </Badge>
            )}
            <Text size="xsmall" className="text-ui-fg-muted">
              {formatRelativeTime(comment.created_at)}
              {comment.is_edited && " (edited)"}
            </Text>
          </div>

          <div className="mt-2">
            {isEditing ? (
              <div className="flex flex-col gap-y-2">
                <Textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center gap-x-2">
                  <Button size="small" onClick={handleEdit} disabled={updateCommentMutation.isPending}>
                    {updateCommentMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button size="small" variant="secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Text size="small" className="whitespace-pre-wrap">
                  {comment.message}
                </Text>
                <div className="flex items-center gap-x-1 mt-2">
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() => onReply(comment.id)}
                  >
                    <ArrowUturnLeft />
                  </Button>
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() => setIsEditing(true)}
                  >
                    <PencilSquare />
                  </Button>
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={handleDelete}
                    disabled={deleteCommentMutation.isPending}
                  >
                    <Trash />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 flex flex-col gap-y-3 pt-3 border-l border-ui-border-base pl-3">
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
  )
}

const ServiceOrderCommentsWidget = ({ data: serviceOrder }: ServiceOrderCommentsWidgetProps) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("comments")

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

  // Filter comments based on active tab
  const filteredComments = comments?.filter((comment: ServiceOrderComment) => {
    if (activeTab === "comments") return comment.author_type !== 'system'
    if (activeTab === "events") return comment.author_type === 'system'
    return true
  }) || []

  // Count events and comments separately
  const eventCount = comments?.filter((c: ServiceOrderComment) => c.author_type === 'system').length || 0
  const commentCount = comments?.filter((c: ServiceOrderComment) => c.author_type !== 'system').length || 0

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Activity</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Loading activity...
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Activity</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}, {eventCount} {eventCount === 1 ? 'event' : 'events'}
        </Text>
      </div>

      <div className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="comments">
              Comments ({commentCount})
            </Tabs.Trigger>
            <Tabs.Trigger value="events">
              Events ({eventCount})
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </div>

      {activeTab === "comments" && (
        <div className="px-6 py-4">
          <CommentForm
            serviceOrderId={serviceOrder.id}
            onSuccess={() => {}}
          />
        </div>
      )}

      <div className="px-6 py-4">
        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <ChatBubble className="h-12 w-12 text-ui-fg-muted mb-4" />
            <Text className="text-ui-fg-muted">No activity yet</Text>
            <Text size="small" className="text-ui-fg-subtle">
              {activeTab === "comments"
                ? "Be the first to add a comment"
                : "No system events recorded"
              }
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-y-4">
            {filteredComments.map((comment: ServiceOrderComment) => (
              <div key={comment.id} className="flex flex-col gap-y-3">
                <CommentItem
                  comment={comment}
                  serviceOrderId={serviceOrder.id}
                  onReply={handleReply}
                />

                {replyingTo === comment.id && comment.author_type !== 'system' && (
                  <div className="ml-12">
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