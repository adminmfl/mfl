import { toast as sonnerToast } from "sonner"

/**
 * Custom toast wrapper that handles different durations for different toast types
 * - Informational toasts (success, info, warning) auto-dismiss after 4 seconds
 * - Error and loading toasts remain until manually dismissed
 */
export const toast = {
    success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
        return sonnerToast.success(message, { duration: 4000, ...options })
    },

    info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
        return sonnerToast.info(message, { duration: 4000, ...options })
    },

    warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) => {
        return sonnerToast.warning(message, { duration: 4000, ...options })
    },

    error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
        return sonnerToast.error(message, { duration: Infinity, ...options })
    },

    loading: (message: string, options?: Parameters<typeof sonnerToast.loading>[1]) => {
        return sonnerToast.loading(message, { duration: Infinity, ...options })
    },

    // For generic toast calls, use default duration
    message: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
        return sonnerToast(message, { duration: 4000, ...options })
    },

    // Expose dismiss function
    dismiss: sonnerToast.dismiss,

    // Expose promise function
    promise: sonnerToast.promise,
}

// Default export for backward compatibility
export default toast