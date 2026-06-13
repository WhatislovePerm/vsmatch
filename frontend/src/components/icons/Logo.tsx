interface Props {
  size?: number;
  className?: string;
}

/**
 * Логотип VSMatch: корона над гео-пином с отверстием.
 * Воссоздан по макету (точного SVG в исходниках не было). fill=currentColor.
 */
export const LOGO_SVG = `<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M14 17 L15 8.5 L19.5 13 L24 6 L28.5 13 L33 8.5 L34 17 Z"/>
  <circle cx="15" cy="7.4" r="2.1"/>
  <circle cx="24" cy="5" r="2.3"/>
  <circle cx="33" cy="7.4" r="2.1"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M24 16.6c5.5 0 10 4.5 10 10.1 0 6.7-7.9 14.6-10 18.7-2.1-4.1-10-12-10-18.7 0-5.6 4.5-10.1 10-10.1Zm0 6a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2Z"/>
</svg>`;

export function Logo({ size = 36, className }: Props) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', lineHeight: 0, width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
    />
  );
}
