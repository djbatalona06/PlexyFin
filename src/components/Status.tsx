export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="status" role="status" aria-live="polite">
      {label}
    </p>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="status error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: string }) {
  return <p className="status muted">{children}</p>
}
