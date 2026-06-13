import type { SportKind } from '../../types';
import { sportIconSvg } from './sportIcons';

interface Props {
  kind: SportKind;
  size?: number;
  className?: string;
}

export function SportIcon({ kind, size = 20, className }: Props) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', lineHeight: 0 }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: sportIconSvg(kind, size) }}
    />
  );
}
