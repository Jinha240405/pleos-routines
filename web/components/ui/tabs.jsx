// Adapted from shadcn/ui new-york-v4, MIT.
import React from 'react';
import * as Primitive from '@radix-ui/react-tabs';
import { cn } from './utils';
export function Tabs({ className, ...props }) { return <Primitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />; }
export function TabsList({ className, ...props }) { return <Primitive.List data-slot="tabs-list" className={cn('inline-flex h-[60px] w-fit items-center gap-6 bg-transparent text-muted-foreground', className)} {...props} />; }
export function TabsTrigger({ className, ...props }) {
  return <Primitive.Trigger data-slot="tabs-trigger" className={cn('inline-flex h-full items-center justify-center gap-2 whitespace-nowrap border-b-2 border-transparent px-1 text-[15px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45 data-[state=active]:border-primary data-[state=active]:text-primary [&_svg]:size-[18px]', className)} {...props} />;
}
