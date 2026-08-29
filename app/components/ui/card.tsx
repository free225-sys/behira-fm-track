import type { HTMLAttributes, ReactNode } from 'react';

type CardTag = 'article' | 'section' | 'aside' | 'div';

export function Card({
  as: Tag = 'article',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: CardTag;
  children: ReactNode;
}) {
  return (
    <Tag className={['panel', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  kicker,
  title,
  description,
  action,
  children,
}: {
  kicker?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="panel-head">
      <div>
        {kicker ? <p className="design-kicker">{kicker}</p> : null}
        {title ? <h3>{title}</h3> : null}
        {description ? <p>{description}</p> : null}
        {children}
      </div>
      {action}
    </div>
  );
}
