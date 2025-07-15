import { clx } from "@medusajs/ui"
import { Children, ComponentPropsWithoutRef, ComponentType } from "react"
import { Outlet } from "react-router-dom"

interface TwoColumnWidgetProps {
  before: ComponentType<any>[]
  after: ComponentType<any>[]
  sideBefore: ComponentType<any>[]
  sideAfter: ComponentType<any>[]
}

interface TwoColumnPageProps<TData> {
  children: React.ReactNode
  widgets: TwoColumnWidgetProps
  data?: TData
  showJSON?: boolean
  showMetadata?: boolean
  hasOutlet?: boolean
}

const Root = <TData,>({
  children,
  widgets,
  data,
  showJSON = false,
  showMetadata = false,
  hasOutlet = true,
}: TwoColumnPageProps<TData>) => {
  const widgetProps = { data }
  const { before, after, sideBefore, sideAfter } = widgets

  const childrenArray = Children.toArray(children)

  if (childrenArray.length !== 2) {
    throw new Error("TwoColumnPage expects exactly two children")
  }

  const [main, sidebar] = childrenArray

  return (
    <div className="flex w-full flex-col gap-y-3">
      {before.map((Component, i) => {
        return <Component {...widgetProps} key={i} />
      })}
      <div className="flex w-full flex-col items-start gap-x-4 gap-y-3 xl:grid xl:grid-cols-[minmax(0,_1fr)_440px]">
        <div className="flex w-full min-w-0 flex-col gap-y-3">
          {main}
          {after.map((Component, i) => {
            return <Component {...widgetProps} key={i} />
          })}
        </div>
        <div className="flex w-full flex-col gap-y-3 xl:mt-0">
          {sideBefore.map((Component, i) => {
            return <Component {...widgetProps} key={i} />
          })}
          {sidebar}
          {sideAfter.map((Component, i) => {
            return <Component {...widgetProps} key={i} />
          })}
        </div>
      </div>
      {hasOutlet && <Outlet />}
    </div>
  )
}

const Main = ({ children }: ComponentPropsWithoutRef<"div">) => {
  return <>{children}</>
}

const Sidebar = ({ children }: ComponentPropsWithoutRef<"div">) => {
  return <>{children}</>
}

export const TwoColumnPage = Object.assign(Root, {
  Main,
  Sidebar,
})