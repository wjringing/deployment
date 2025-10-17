import React from 'react';

const Label = React.forwardRef(({ className, children, ...props }, ref) => (
  <label
    ref={ref}
    className={`form-label ${className || ''}`}
    {...props}
  >
    {children}
  </label>
));

Label.displayName = 'Label';

export { Label };
