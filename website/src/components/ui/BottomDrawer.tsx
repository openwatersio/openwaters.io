import { useState, useRef, type ReactNode } from "react";

type DrawerState = "collapsed" | "half" | "expanded";

interface BottomDrawerProps {
  children: ReactNode;
  onFocus?: () => void;
}

export function BottomDrawer({ children, onFocus }: BottomDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchStartHeight = useRef<number>(0);

  const [drawerState, setDrawerState] = useState<DrawerState>("collapsed");
  const [isDragging, setIsDragging] = useState(false);

  // Drawer height calculations
  const getDrawerHeight = () => {
    switch (drawerState) {
      case "collapsed":
        return "120px";
      case "half":
        return "50vh";
      case "expanded":
        return "85vh";
      default:
        return "120px";
    }
  };

  // Touch handlers for drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!drawerRef.current) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartHeight.current = drawerRef.current.offsetHeight;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !drawerRef.current) return;

    const deltaY = touchStartY.current - e.touches[0].clientY;
    const newHeight = touchStartHeight.current + deltaY;
    const windowHeight = window.innerHeight;

    // Update drawer position during drag
    if (newHeight > 100 && newHeight < windowHeight * 0.9) {
      drawerRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !drawerRef.current) return;

    const currentHeight = drawerRef.current.offsetHeight;
    const windowHeight = window.innerHeight;

    // Snap to nearest state based on current height
    if (currentHeight < windowHeight * 0.25) {
      setDrawerState("collapsed");
    } else if (currentHeight < windowHeight * 0.65) {
      setDrawerState("half");
    } else {
      setDrawerState("expanded");
    }

    setIsDragging(false);
    drawerRef.current.style.height = ""; // Reset inline style
  };

  const handleDrawerHeaderClick = () => {
    // Cycle through states on header click
    if (drawerState === "collapsed") {
      setDrawerState("half");
    } else if (drawerState === "half") {
      setDrawerState("expanded");
    } else {
      setDrawerState("collapsed");
    }
  };

  const handleChildFocus = () => {
    // Expand drawer when child element is focused
    if (drawerState === "collapsed") {
      setDrawerState("half");
    }
    onFocus?.();
  };

  return (
    <div
      ref={drawerRef}
      className="fixed bottom-0 left-0 right-0 z-10 rounded-t-3xl bg-white shadow-2xl transition-all duration-300 ease-out md:hidden"
      style={{
        height: isDragging ? undefined : getDrawerHeight(),
        touchAction: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drawer handle */}
      <div
        className="flex cursor-pointer justify-center pb-2 pt-3"
        onClick={handleDrawerHeaderClick}
      >
        <div className="h-1.5 w-12 rounded-full bg-navy-300" />
      </div>

      {/* Drawer content */}
      <div
        className="flex h-[calc(100%-2rem)] flex-col gap-4 overflow-y-auto px-4 pb-4"
        onFocus={handleChildFocus}
      >
        {children}
      </div>
    </div>
  );
}
