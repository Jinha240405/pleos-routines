// Adapted from shadcn/ui new-york-v4, MIT. See THIRD_PARTY_NOTICES.md.
import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from './utils';
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[15px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0',
  { variants: {
    variant: {
      default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
      outline: 'border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-destructive text-white hover:bg-destructive/90',
    },
    size: { default: 'h-11 px-4 py-2', sm: 'h-11 gap-1.5 px-3', icon: 'size-10' },
  }, defaultVariants: { variant: 'default', size: 'default' } },
);
export function Button({ className, variant, size, asChild = false, ...props }) {
  const Component = asChild ? Slot : 'button';
  return <Component data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
