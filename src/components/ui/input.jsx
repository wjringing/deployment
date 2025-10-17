import React from 'react';
import { Input as AntInput } from 'antd';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <AntInput
      ref={ref}
      type={type}
      className={className}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
