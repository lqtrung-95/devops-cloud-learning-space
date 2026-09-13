"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

interface UserAccountMenuProps {
  name: string;
  email: string;
  image?: string | null;
}

export function UserAccountMenu({ name, email, image }: UserAccountMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside, like a native menu.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);
  const displayName = name || email.split("@")[0];

  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar from OAuth provider, arbitrary host
          <img src={image} alt="" className="size-7 rounded-full" />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{displayName}</span>
      </button>
      {isOpen && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg dark:border-stone-800 dark:bg-stone-900">
          <p className="truncate px-3 py-2 text-xs text-stone-500">{email}</p>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
