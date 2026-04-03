import type { ComponentProps } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type RenderButtonOptions = {
  ariaLabel?: string
  className?: string
  contentHtml: string
  disabled?: boolean
  id?: string
  size?: ComponentProps<typeof Button>["size"]
  type?: "button" | "submit" | "reset"
  variant?: ComponentProps<typeof Button>["variant"]
}

type RenderInputOptions = {
  ariaLabel?: string
  className?: string
  defaultValue?: string
  disabled?: boolean
  id?: string
  placeholder?: string
  type?: string
}

type RenderTextareaOptions = {
  ariaLabel?: string
  className?: string
  defaultValue?: string
  id?: string
  placeholder?: string
}

type RenderBadgeOptions = {
  className?: string
  contentHtml: string
  variant?: ComponentProps<typeof Badge>["variant"]
}

export function renderButtonMarkup({
  ariaLabel,
  className,
  contentHtml,
  disabled = false,
  id,
  size,
  type = "button",
  variant,
}: RenderButtonOptions) {
  return renderToStaticMarkup(
    <Button
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      id={id}
      size={size}
      type={type}
      variant={variant}
    >
      <span className="contents" dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </Button>,
  )
}

export function renderInputMarkup({
  ariaLabel,
  className,
  defaultValue,
  disabled = false,
  id,
  placeholder,
  type = "text",
}: RenderInputOptions) {
  return renderToStaticMarkup(
    <Input
      aria-label={ariaLabel}
      className={className}
      defaultValue={defaultValue}
      disabled={disabled}
      id={id}
      placeholder={placeholder}
      type={type}
    />,
  )
}

export function renderTextareaMarkup({
  ariaLabel,
  className,
  defaultValue,
  id,
  placeholder,
}: RenderTextareaOptions) {
  return renderToStaticMarkup(
    <Textarea
      aria-label={ariaLabel}
      className={className}
      defaultValue={defaultValue}
      id={id}
      placeholder={placeholder}
    />,
  )
}

export function renderBadgeMarkup({
  className,
  contentHtml,
  variant,
}: RenderBadgeOptions) {
  return renderToStaticMarkup(
    <Badge className={className} variant={variant}>
      <span className="contents" dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </Badge>,
  )
}
