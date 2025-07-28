import { 
  Container, 
  Heading, 
  Text, 
  Button, 
  Textarea,
  Badge,
  Avatar,
  toast,
  Tabs
} from "@medusajs/ui"
import { ChatBubble, ArrowUturnLeft, PencilSquare, Trash, Clock, Tools, User } from "@medusajs/icons"
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
      is_internal: false
    })
  }

  const handleResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  useEffect(() => {
    handleResize()
  }, [message])

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          placeholder={parentId ? "Write a reply..." : "Add a comment..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onInput={handleResize}
          rows={3}
          className="min-h-[80px]"
        />
        <div className="flex items-center justify-end">
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
      </div>
    </form>
  )
}

// Event Icon Component
const EventIcon = ({ eventType }: { eventType?: string }) => {
  switch (eventType) {
    case 'status_change':
      return <Clock className="h-4 w-4" />
    case 'item_added':
      return <Tools className="h-4 w-4" />
    case 'time_entry':
      return <Clock className="h-4 w-4" />
    default:
      return <User className="h-4 w-4" />
  }
}

// Event Message Component
const EventMessage = ({ comment }: { comment: ServiceOrderComment }) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0">
        <div className="bg-ui-bg-base shadow-borders-base flex size-7 items-center justify-center rounded-md">
          <div className="bg-ui-bg-component flex size-6 items-center justify-center rounded-[4px]">
            <EventIcon eventType={comment.metadata?.event_type} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Text size="small" className="font-medium">
            System Event
          </Text>
          <Badge size="2xsmall" color="grey">
            {comment.metadata?.event_type?.replace('_', ' ') || 'event'}
          </Badge>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {formatRelativeTime(comment.created_at)}
          </Text>
        </div>
        
        <Text size="small" className="text-ui-fg-subtle">
          {comment.message}
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
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Activity</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Loading activity...
            </Text>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Activity</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {commentCount} comments, {eventCount} events
          </Text>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="comments">Comments ({commentCount})</Tabs.Trigger>
            <Tabs.Trigger value="events">Events ({eventCount})</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </div>
      
      {/* New Comment Form */}
      <div className="px-6 py-4">
        <CommentForm
          serviceOrderId={serviceOrder.id}
          onSuccess={() => {}}
        />
      </div>
      
      {/* Activity List */}
      <div className="px-6 py-4">
        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <ChatBubble className="w-12 h-12 text-ui-fg-muted mb-4" />
            <Text className="text-ui-fg-muted mb-2">No activity yet</Text>
            <Text size="small" className="text-ui-fg-subtle">
              {activeTab === "comments"
                ? "Be the first to add a comment"
                : "No system events recorded yet"
              }
            </Text>
          </div>
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