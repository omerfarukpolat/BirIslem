import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { Icon } from './Icon';

/** Yerel <dialog> üzerine kurulu alt sayfa / pencere. Esc ve arka plana tıklama kapatır. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label?: string;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      class="sheet"
      aria-label={label ?? title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div class="sheet__head">
            <h2>{title}</h2>
            <button class="icon-btn" type="button" onClick={onClose} aria-label="Kapat">
              <Icon name="close" />
            </button>
          </div>
          <div class="sheet__body">{children}</div>
        </>
      )}
    </dialog>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div class="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          class="seg__opt"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TopBar({
  title,
  back = '/',
  onBack,
  right,
}: {
  title: ComponentChildren;
  back?: string | null;
  onBack?: () => void;
  right?: ComponentChildren;
}) {
  const { route } = useLocation();
  return (
    <header class="topbar">
      <div>
        {(back !== null || onBack) && (
          <button
            class="icon-btn"
            type="button"
            aria-label="Geri"
            onClick={() => (onBack ? onBack() : back !== null && route(back))}
          >
            <Icon name="back" />
          </button>
        )}
      </div>
      <h1 class="topbar__title">{title}</h1>
      <div class="topbar__side">{right}</div>
    </header>
  );
}

/** Başlık etiketini günceller. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Bir İşlem` : 'Bir İşlem - Matematik Zeka Oyunu';
  }, [title]);
}

/** Onay penceresi (tarayıcının confirm() kutusu yerine) */
export function Confirm({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p>{message}</p>
      <div class="confirm-actions">
        <button type="button" class="btn" onClick={onCancel}>
          Vazgeç
        </button>
        <button type="button" class="btn btn--primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
