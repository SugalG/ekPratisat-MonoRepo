import { authenticatedFetch } from "@repo/shared-provider";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

//add category hook
export const useCreateCategory = () => {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/add-category`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw data;
      }

      return data;
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't add category!!!");
    },
  });
};

//add district hook
export const useCreateDistrict = () => {
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/add-district`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw data;
      }
      return data;
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't add district!!!");
    },
  });
};

//add municipality hook
export const useCreateMunicipality = () => {
  return useMutation({
    mutationFn: async ({
      name,
      parentId,
    }: {
      name: string;
      parentId: string;
    }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/add-municipality`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, parentId }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw data;
      }
      return data;
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't add Municipality!!!");
    },
  });
};

//add ward
export const useCreateWard = () => {
  return useMutation({
    mutationFn: async ({
      name,
      parentId,
    }: {
      name: string;
      parentId: string;
    }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/add-ward`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, parentId }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw data;
      }
      return data;
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't add ward");
    },
  });
};

//add property
export const useCreateProperty = () => {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/add-property`,
        {
          method: "POST",
          body: formData,
        },
      );
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't add property!!!");
    },
  });
};

//edit property 
export const useEditProperty = (id:string) => {
  return useMutation({
     mutationFn: async (formData: FormData) => {
      return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/edit-property/${id}`,
        {
          method: "PUT",
          body: formData,
        },
      );
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't add property!!!");
    },
  })
}

//verify Property
export const useVerifyProperty = () => {
  return useMutation({
    mutationFn: async ({ propertyId }: { propertyId: string }) => {
      return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/mark-verified`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ propertyId }),
        },
      );
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't add property!!!");
    },
  });
};

//mark featured
export const useFeatureProperty = () => {
  return useMutation({
    mutationFn: async ({
      propertyId,
      isFeatured,
    }: {
      propertyId: string;
      isFeatured: boolean;
    }) => {
      return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/mark-featured`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ propertyId, isFeatured }),
        },
      );
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't add property!!!");
    },
  });
};

//toggle favourites

export const useToggleFavourite = () => {
  return useMutation({
    mutationFn: async ({ propertyId }: { propertyId: string }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/toggle-favourite`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ propertyId }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw data;
      }
      return data;
    },
    onError:(error) => {
      toast.error(error.message || "Operation Failed")
    }
  });
};


//deactivate listing

export const useDeactivateListing = () => {
  return useMutation ({
    mutationFn: async ({id} : {id:string}) => {
       return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/${id}`,
        {
          method: "DELETE",
        },
      );
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't Delete property!!!");
    },
  });
}

export const usetoggleActiveListing = () => {
   return useMutation ({
    mutationFn: async ({id} : {id:string}) => {
       return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/${id}`,
        {
          method: "PUT",
        },
      );
    },
    onError: (error) => {
      toast.error(error.message || "Status updated!!!");
    },
  });
}



export const useDeleteProperty = () => {
  return useMutation ({
    mutationFn: async ({id} : {id:string}) => {
       return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/delete/${id}`,
        {
          method: "DELETE",
        },
      );
    },
    onError: (error) => {
      toast.error(error.message || "Operation Failed!!!");
    },
  });
}


export const useAddPropertyOwnerInfo = () => {
  return useMutation ({
    mutationFn: async ({propertyId, note} : {propertyId:string, note:any}) => {
       return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/update-property-owner-info/${propertyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({note})
        },
      );
    },
    onError: (error) => {
      toast.error(error.message || "Operation Failed!!!");
    },
  });
}


export const useAddAmenity = () => {
  return useMutation({
    mutationFn: async (payload : {name:string,icon:string}) => {
       return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/amenities/add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload)
        },
      );
    },
     onError: (error) => {
      toast.error(error.message || "Operation Failed!!!");
    }
  })
}

//update cover image
export const useUpdateCoverImage = (id:string) => {
  return useMutation({
    mutationFn: async (coverId:string) => {
       return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/update-cover/${id}?coverId=${coverId}`,
        {
          method: "PUT",
        },
      );
    },
     onError: (error) => {
      toast.error(error.message || "Operation Failed!!!");
    }
  })
}

//update category
export const useUpdateCategory = () => {
   return useMutation({
    mutationFn: async ({id,formData}:{id:string,formData:FormData} ) => {
       return authenticatedFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/listing/update-category/${id}`,
        {
          method: "PUT",
          body: formData,
        },
      );
    },
     onError: (error) => {
      toast.error(error.message || "Operation Failed!!!");
    }
  })
}