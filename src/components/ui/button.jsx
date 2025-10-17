import React from 'react';
import { Button as AntButton } from 'antd';

const Button = React.forwardRef(({ children, className, variant, size, ...props }, ref) => {
  let type = 'default';

  if (variant === 'default' || variant === 'primary') type = 'primary';
  if (variant === 'destructive' || variant === 'danger') type = 'primary';
  if (variant === 'ghost') type = 'ghost';
  if (variant === 'link') type = 'link';
  if (variant === 'outline') type = 'default';

  let buttonSize = 'middle';
  if (size === 'sm') buttonSize = 'small';
  if (size === 'lg') buttonSize = 'large';

  const isDanger = variant === 'destructive' || variant === 'danger';

  return (
    <AntButton
      ref={ref}
      type={type}
      size={buttonSize}
      danger={isDanger}
      className={className}
      {...props}
    >
      {children}
    </AntButton>
  );
});

Button.displayName = 'Button';

export { Button };
