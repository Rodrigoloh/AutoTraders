import { useState } from 'react';

export function BrandLogo({
  src,
  alt,
  brand,
  submark,
  className = '',
  compact = false,
}) {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <img
        className={className}
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`brand-fallback ${compact ? 'brand-fallback-compact' : ''} ${className}`.trim()}>
      <span>{brand}</span>
      {submark ? <small>{submark}</small> : null}
    </div>
  );
}
