import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-slate-950 text-white shadow-[0_8px_22px_rgba(15,23,42,0.16)] hover:bg-indigo-600 hover:shadow-[0_10px_28px_rgba(79,70,229,0.24)]",
        destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
        outline: "border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-700",
        secondary: "border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
        ghost: "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950",
        link: "text-indigo-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-6 text-sm",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn("flex h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50", className)}
    ref={ref}
    {...props}
  />
))
Input.displayName = "Input"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn("flex min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm leading-6 text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50", className)}
    ref={ref}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-2xl border border-slate-200/80 bg-white text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.03),0_16px_36px_rgba(15,23,42,0.035)]", className)} {...props} />
))
Card.displayName = "Card"

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-semibold leading-none tracking-[-0.02em] text-slate-950", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'outline' | 'destructive' }>(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: "border-transparent bg-indigo-600 text-white",
    secondary: "border-indigo-100 bg-indigo-50 text-indigo-700",
    destructive: "border-red-100 bg-red-50 text-red-700",
    outline: "border-slate-200 bg-white text-slate-700"
  }
  return <div ref={ref} className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors", variants[variant], className)} {...props} />
})
Badge.displayName = "Badge"

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("text-sm font-semibold leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
))
Label.displayName = "Label"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn("flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}>{children}</select>
))
Select.displayName = "Select"

export const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
)

export const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "info" | "success" | "warning" | "error" }>(
  ({ className, variant = "info", ...props }, ref) => {
    const variants = {
      info: "border-indigo-100 bg-indigo-50/80 text-indigo-950",
      success: "border-emerald-100 bg-emerald-50/80 text-emerald-950",
      warning: "border-amber-100 bg-amber-50/80 text-amber-950",
      error: "border-red-100 bg-red-50/80 text-red-950",
    }
    return <div ref={ref} className={cn("rounded-2xl border p-4 text-sm shadow-sm", variants[variant], className)} {...props} />
  }
)
Alert.displayName = "Alert"

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void; }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "min-h-9 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-all",
            active === tab.id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900",
          )}
        >{tab.label}</button>
      ))}
    </div>
  )
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void; }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">Close</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description: string; action?: React.ReactNode; }) {
  return (
    <div className="career-surface flex flex-col items-center justify-center rounded-3xl border-dashed px-6 py-14 text-center">
      {icon ? <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">{icon}</div> : null}
      <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="career-surface flex min-h-40 items-center justify-center rounded-2xl text-sm font-medium text-slate-500">
      <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      {label}
    </div>
  )
}
