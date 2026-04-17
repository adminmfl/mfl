"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { toast as sonnerToast } from "sonner"
import { Toaster } from "./sonner"

export function ToastManager() {
    const pathname = usePathname()

    // Clear all toasts on route change
    useEffect(() => {
        sonnerToast.dismiss()
    }, [pathname])

    return (
        <Toaster
            position="top-center"
            richColors
            closeButton
            duration={4000}
        />
    )
}