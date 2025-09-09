// Re-export Clerk authentication functions
export {
  getCurrentUser,
  getCurrentUserId,
  getUserProfile,
  createUserProfile,
  updateUserPoints,
  createScan,
  getUserScans,
  createPayment
} from "@/lib/clerk-auth"
