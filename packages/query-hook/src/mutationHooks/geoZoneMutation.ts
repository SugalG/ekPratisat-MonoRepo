import { authenticatedFetch } from "@repo/shared-provider";
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"


export const useCreateZoneMutation = () => {
    return useMutation({
        mutationFn: async (formData:any) => {
            const result = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/zone/create`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await result.json();
            if (!result.ok) {
                throw data;
            }
            return data;
        },
        onError: (error) => {
            toast.error(error.message || "Couldn't create zone!!!")
        }
    })
}

export function useDeleteZoneMutation() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/zone/delete/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Delete failed");
      }

      return data;
    },
  });
}


export function useAssignZoneToAgentMutation() {
  return useMutation({
    mutationFn: async ({ agentId, zoneId }: { agentId: string; zoneId: string }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/zone/assign-zone`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agentId, zoneId }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Assignment failed");
      }

      return data;
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't assign zone to agent!!!");
    },
  });   
}


export const useRevokeZoneAssignment = () => {
    return useMutation({
        mutationFn:async({agentId, zoneId}: {agentId:string,zoneId:string}) => {
            return authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/revoke-zone?agentId=${agentId}&zoneId=${zoneId}`, {
                method: "DELETE",
            });
        },
        onError: (error) => {
            toast.error(error.message || "Unexpected Error")
        }
    })
}

