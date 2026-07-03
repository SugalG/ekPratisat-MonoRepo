import { editBasicInfoAction } from "@repo/actions"
import { authenticatedFetch } from "@repo/shared-provider"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

export const useVerifyAgent = () => {
    return useMutation({
        mutationFn: async ({userId,isVerified} : {userId:string, isVerified:boolean}) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify-agent`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, isVerified })
            });
            const data = await res.json();

            if (!res.ok) {
                throw data;
            }
            return data;
        },
        onError: (error) => {
            toast.error(error.message || "Unexpected Error")
        }
    })
}

export const useEditBasicInfo = () => {
    return useMutation({
        mutationFn: editBasicInfoAction,
        onError: (error) => {
            toast.error(error.message || "Unexpected Error")
        }
    })
}


export const useToggleActive = () => {
    return useMutation({
        mutationFn: async ({agentId,activeStatus} : {agentId:string,activeStatus:boolean}) => {
            return authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/toggle-active`, {
                 method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({agentId,activeStatus})
            });
        },
        onError: (error) => {
            toast.error(error.message || "Unexpected Error")
        }
    })
}

export const useChangeUserRole = () => {
    return useMutation({
        mutationFn: async ({userId,role} : {userId:string,role:string}) => {
            return authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/change-role/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({role})
            });
        },
        onError: (error) => {
            toast.error(error.message || "Unexpected Error")
        }
    })
}


