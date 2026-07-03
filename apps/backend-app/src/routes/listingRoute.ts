import { Router } from "express";
import {
  checkAuthentication,
  requireAdmin,
  requireAdminOrStaff,
} from "../middleware/checkAuthentication.js";
import {
  addAmenity,
  addProperty,
  checkFavourite,
  createCategory,
  deactivateListing,
  deleteProperty,
  featureListing,
  fetchUserFavourites,
  getAllProperties,

  getAmenities,

  getListingById,

  getUserListings,
  toggleActivateListing,
  toggleFavourite,
  updateCategory,
  updateCoverImage,
  updateProperty,
  updatePropertyOwnerInfo,
  uploadCategoryImageFile,
  verifyListing,
} from "../controller/listingController.js";
import { uploadUserFiles } from "../middleware/userUpload.js";
import { addDistrictController, addMunicipalityController, addWardController } from "../controller/locationController.js";

const listingRouter = Router();

listingRouter.post(
  "/add-category",
  checkAuthentication,
  requireAdmin,
  uploadUserFiles.single("image"),
  createCategory,
);
listingRouter.post(
  "/add-property",
  checkAuthentication,
  uploadUserFiles.any(),
  addProperty,
);

listingRouter.post("/add-district", checkAuthentication, requireAdminOrStaff, addDistrictController);
listingRouter.post("/add-municipality", checkAuthentication, requireAdminOrStaff, addMunicipalityController);
listingRouter.post("/add-ward", checkAuthentication, requireAdminOrStaff, addWardController);
listingRouter.post("/amenities/add", checkAuthentication,requireAdmin, addAmenity);
listingRouter.post("/toggle-favourite", checkAuthentication, toggleFavourite);
listingRouter.post("/check-favourite", checkFavourite)

listingRouter.put("/edit-property/:id", checkAuthentication, uploadUserFiles.any(), updateProperty);
listingRouter.put("/update-property-owner-info/:id", checkAuthentication,requireAdminOrStaff, updatePropertyOwnerInfo);
listingRouter.put("/mark-verified",checkAuthentication,requireAdmin,verifyListing);
listingRouter.put("/mark-featured",checkAuthentication,requireAdmin,featureListing);
listingRouter.put("/update-cover/:id", checkAuthentication,updateCoverImage);
listingRouter.put("/update-category/:id",checkAuthentication,requireAdmin,uploadUserFiles.single("image"),updateCategory);
listingRouter.put("/:id", checkAuthentication, requireAdmin, toggleActivateListing);

listingRouter.get("/my-listings", checkAuthentication, getUserListings);
listingRouter.get("/my-favourites",checkAuthentication,fetchUserFavourites);
listingRouter.get("/get-all",checkAuthentication,requireAdminOrStaff,getAllProperties);
listingRouter.get("/amenities", getAmenities);
listingRouter.get("/:id", getListingById);




listingRouter.delete("/delete/:id", checkAuthentication, requireAdmin, deleteProperty);
listingRouter.delete("/:id", checkAuthentication, deactivateListing);

export default listingRouter;
