"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@survey/ui/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-none border border-input bg-input/50 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchThumb />
    </SwitchPrimitive.Root>
  )
}

function SwitchThumb({ className, ...props }: SwitchPrimitive.Thumb.Props) {
  return (
    <SwitchPrimitive.Thumb
      data-slot="switch-thumb"
      className={cn(
        "block size-4 translate-x-0.5 rounded-none bg-background shadow-sm transition-transform data-checked:translate-x-[18px]",
        className
      )}
      {...props}
    />
  )
}

export { Switch, SwitchThumb }
