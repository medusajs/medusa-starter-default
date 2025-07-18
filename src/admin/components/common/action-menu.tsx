import React from "react"
import { EllipsisHorizontal } from "@medusajs/icons"
import { DropdownMenu, IconButton } from "@medusajs/ui"
import { Link } from "react-router-dom"

type ActionMenuAction = {
  label: string
  icon?: React.ReactNode
  to?: string
  onClick?: () => void
  render?: () => React.ReactNode
}

type ActionMenuGroup = {
  actions: ActionMenuAction[]
}

type ActionMenuProps = {
  groups: ActionMenuGroup[]
}

export const ActionMenu = ({ groups }: ActionMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton variant="transparent">
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {groups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.actions.map((action, actionIndex) => (
              <React.Fragment key={actionIndex}>
                {action.render ? (
                  action.render()
                ) : (
                  <DropdownMenu.Item asChild={!!action.to}>
                    {action.to ? (
                      <Link to={action.to} className="flex items-center gap-2">
                        {action.icon}
                        {action.label}
                      </Link>
                    ) : (
                      <button
                        onClick={action.onClick}
                        className="flex w-full items-center gap-2"
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    )}
                  </DropdownMenu.Item>
                )}
              </React.Fragment>
            ))}
            {groupIndex < groups.length - 1 && <DropdownMenu.Separator />}
          </div>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}