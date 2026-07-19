import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle, ShieldCheck } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>
}

export function Button({ children, variant = 'primary', loading, icon, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean; icon?: ReactNode }) {
  return <button className={`button button-${variant}`} disabled={loading || props.disabled} {...props}>
    {loading ? <LoaderCircle size={16} className="spin" /> : icon}
    <span>{children}</span>
  </button>
}

export function PrivacyNote() {
  return <div className="privacy-note"><ShieldCheck size={16} /><span>資料處理與保存方式可依部署環境及公司資安政策設定。</span></div>
}

export function MockBadge() {
  return null
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
}
