import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* - w-screen h-screen: Forces the layout to be the size of the window.
       - bg-[var(--surface-card)]: Keeps your background color.
       - flex: Removes all grid/column limitations.
    */
    <div className="w-screen min-h-screen bg-[var(--surface-card)] flex">
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}